from __future__ import annotations

import csv
import statistics
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pyopencl as cl

from kernels import STREAM_KERNEL_SOURCE


BYTES_PER_ELEMENT_TRANSFER = np.dtype(np.int32).itemsize + 2 * np.dtype(np.float32).itemsize


@dataclass(frozen=True)
class BenchmarkConfig:
    warmups: int = 3
    repeats: int = 7
    scalar: float = 2.0
    random_seed: int = 42


def round_up(n: int, multiple: int) -> int:
    return ((n + multiple - 1) // multiple) * multiple


def make_indices(pattern: str, n: int, stride: int = 1, seed: int = 42) -> np.ndarray:
    if pattern == "coalesced":
        return np.arange(n, dtype=np.int32)

    if pattern == "strided":
        return ((np.arange(n, dtype=np.int64) * stride) % n).astype(np.int32)

    if pattern == "random":
        rng = np.random.default_rng(seed)
        return rng.permutation(n).astype(np.int32)

    raise ValueError(f"Unknown access pattern: {pattern}")


def choose_device(preferred: str = "gpu") -> cl.Device:
    platforms = cl.get_platforms()
    if not platforms:
        raise RuntimeError("No OpenCL platforms found.")

    devices: list[cl.Device] = []
    for platform in platforms:
        devices.extend(platform.get_devices())

    if not devices:
        raise RuntimeError("No OpenCL devices found.")

    preference_order = {
        "gpu": [cl.device_type.GPU, cl.device_type.ACCELERATOR, cl.device_type.CPU],
        "cpu": [cl.device_type.CPU, cl.device_type.GPU, cl.device_type.ACCELERATOR],
        "any": [cl.device_type.GPU, cl.device_type.ACCELERATOR, cl.device_type.CPU],
    }
    order = preference_order.get(preferred.lower())
    if order is None:
        raise ValueError(f"Unknown device preference: {preferred}")

    for type_flag in order:
        for device in devices:
            if device.type & type_flag:
                return device

    return devices[0]


def build_program(context: cl.Context) -> cl.Program:
    return cl.Program(context, STREAM_KERNEL_SOURCE).build()


def bytes_transferred(n: int) -> int:
    return n * BYTES_PER_ELEMENT_TRANSFER


def to_gbps(num_bytes: int, seconds: float) -> float:
    return num_bytes / seconds / 1e9


def write_csv(path: str | Path, rows: list[dict[str, object]], fieldnames: list[str]) -> None:
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def run_memory_kernel(
    context: cl.Context,
    queue: cl.CommandQueue,
    program: cl.Program,
    n: int,
    pattern: str,
    stride: int,
    local_size: int,
    config: BenchmarkConfig,
) -> dict[str, object]:
    if local_size <= 0:
        raise ValueError("local_size must be positive.")

    a = np.linspace(1.0, 2.0, num=n, dtype=np.float32)
    b = np.empty(n, dtype=np.float32)
    idx = make_indices(pattern, n, stride=stride, seed=config.random_seed)

    mf = cl.mem_flags
    a_buf = cl.Buffer(context, mf.READ_ONLY | mf.COPY_HOST_PTR, hostbuf=a)
    b_buf = cl.Buffer(context, mf.WRITE_ONLY, b.nbytes)
    idx_buf = cl.Buffer(context, mf.READ_ONLY | mf.COPY_HOST_PTR, hostbuf=idx)

    global_size = (round_up(n, local_size),)
    local_shape = (local_size,)
    elapsed: list[float] = []

    def enqueue() -> cl.Event:
        return program.stream_kernel(
            queue,
            global_size,
            local_shape,
            a_buf,
            b_buf,
            idx_buf,
            np.float32(config.scalar),
            np.int32(n),
        )

    for _ in range(config.warmups):
        enqueue().wait()

    for _ in range(config.repeats):
        event = enqueue()
        event.wait()
        elapsed.append((event.profile.end - event.profile.start) * 1e-9)

    cl.enqueue_copy(queue, b, b_buf).wait()

    sample_count = min(1024, n)
    if not np.allclose(b[:sample_count], a[idx[:sample_count]] * config.scalar):
        raise RuntimeError("Result validation failed for sampled output values.")

    median_seconds = statistics.median(elapsed)
    mean_seconds = statistics.fmean(elapsed)
    transfer_bytes = bytes_transferred(n)

    return {
        "pattern": pattern,
        "stride": stride,
        "n": n,
        "local_size": local_size,
        "median_seconds": median_seconds,
        "mean_seconds": mean_seconds,
        "min_seconds": min(elapsed),
        "max_seconds": max(elapsed),
        "gbps": to_gbps(transfer_bytes, median_seconds),
        "transfer_bytes": transfer_bytes,
    }


def benchmark_access_patterns(
    context: cl.Context,
    queue: cl.CommandQueue,
    program: cl.Program,
    n: int,
    local_size: int,
    config: BenchmarkConfig,
) -> list[dict[str, object]]:
    jobs = [
        ("coalesced", 1),
        ("strided", 2),
        ("strided", 4),
        ("strided", 8),
        ("strided", 16),
        ("strided", 32),
        ("random", 1),
    ]
    rows = []
    for pattern, stride in jobs:
        row = run_memory_kernel(
            context=context,
            queue=queue,
            program=program,
            n=n,
            pattern=pattern,
            stride=stride,
            local_size=local_size,
            config=config,
        )
        rows.append(row)
    return rows


def benchmark_scaling(
    context: cl.Context,
    queue: cl.CommandQueue,
    program: cl.Program,
    sizes: list[int],
    local_size: int,
    config: BenchmarkConfig,
) -> list[dict[str, object]]:
    rows = []
    for n in sizes:
        row = run_memory_kernel(
            context=context,
            queue=queue,
            program=program,
            n=n,
            pattern="coalesced",
            stride=1,
            local_size=local_size,
            config=config,
        )
        rows.append(row)
    return rows


def benchmark_workgroup_sizes(
    context: cl.Context,
    queue: cl.CommandQueue,
    program: cl.Program,
    n: int,
    requested_sizes: list[int],
    config: BenchmarkConfig,
) -> list[dict[str, object]]:
    kernel = cl.Kernel(program, "stream_kernel")
    device = queue.device
    kernel_limit = kernel.get_work_group_info(cl.kernel_work_group_info.WORK_GROUP_SIZE, device)
    device_limit = int(device.max_work_group_size)
    effective_limit = min(int(kernel_limit), device_limit)

    rows = []
    for local_size in requested_sizes:
        if local_size > effective_limit:
            continue
        row = run_memory_kernel(
            context=context,
            queue=queue,
            program=program,
            n=n,
            pattern="coalesced",
            stride=1,
            local_size=local_size,
            config=config,
        )
        rows.append(row)
    return rows
