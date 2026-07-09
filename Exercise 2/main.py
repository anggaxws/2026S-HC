from __future__ import annotations

import argparse
from pathlib import Path

import pyopencl as cl

from benchmark import (
    BenchmarkConfig,
    benchmark_access_patterns,
    benchmark_scaling,
    benchmark_workgroup_sizes,
    build_program,
    choose_device,
    write_csv,
)
from device_info import print_device_info, save_device_info
from plot_results import (
    save_access_pattern_plot,
    save_scaling_plot,
    save_workgroup_plot,
)


RESULTS_DIR = Path(__file__).resolve().parent / "results"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="PyOpenCL memory bandwidth benchmark")
    parser.add_argument("--device", choices=["gpu", "cpu", "any"], default="gpu")
    parser.add_argument("--warmups", type=int, default=3)
    parser.add_argument("--repeats", type=int, default=7)
    parser.add_argument("--access-size", type=int, default=2**25)
    parser.add_argument("--workgroup-base", type=int, default=256)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    config = BenchmarkConfig(warmups=args.warmups, repeats=args.repeats)

    device = choose_device(args.device)
    context = cl.Context([device])
    queue = cl.CommandQueue(
        context,
        properties=cl.command_queue_properties.PROFILING_ENABLE,
    )
    program = build_program(context)

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    print_device_info(device)
    save_device_info(device, RESULTS_DIR / "device_info.json")

    access_rows = benchmark_access_patterns(
        context=context,
        queue=queue,
        program=program,
        n=args.access_size,
        local_size=args.workgroup_base,
        config=config,
    )
    write_csv(
        RESULTS_DIR / "access_patterns.csv",
        access_rows,
        [
            "pattern",
            "stride",
            "n",
            "local_size",
            "median_seconds",
            "mean_seconds",
            "min_seconds",
            "max_seconds",
            "gbps",
            "transfer_bytes",
        ],
    )

    scaling_rows = benchmark_scaling(
        context=context,
        queue=queue,
        program=program,
        sizes=[2**20, 2**22, 2**24, 2**26],
        local_size=args.workgroup_base,
        config=config,
    )
    write_csv(
        RESULTS_DIR / "scaling.csv",
        scaling_rows,
        [
            "pattern",
            "stride",
            "n",
            "local_size",
            "median_seconds",
            "mean_seconds",
            "min_seconds",
            "max_seconds",
            "gbps",
            "transfer_bytes",
        ],
    )

    workgroup_rows = benchmark_workgroup_sizes(
        context=context,
        queue=queue,
        program=program,
        n=args.access_size,
        requested_sizes=[32, 64, 128, 256, 512],
        config=config,
    )
    write_csv(
        RESULTS_DIR / "workgroup_sizes.csv",
        workgroup_rows,
        [
            "pattern",
            "stride",
            "n",
            "local_size",
            "median_seconds",
            "mean_seconds",
            "min_seconds",
            "max_seconds",
            "gbps",
            "transfer_bytes",
        ],
    )

    save_access_pattern_plot(
        RESULTS_DIR / "access_patterns.csv",
        RESULTS_DIR / "access_patterns.png",
    )
    save_scaling_plot(
        RESULTS_DIR / "scaling.csv",
        RESULTS_DIR / "scaling.png",
    )
    save_workgroup_plot(
        RESULTS_DIR / "workgroup_sizes.csv",
        RESULTS_DIR / "workgroup_sizes.png",
    )

    print()
    print("Benchmark completed.")
    print(f"Results written to: {RESULTS_DIR}")


if __name__ == "__main__":
    main()
