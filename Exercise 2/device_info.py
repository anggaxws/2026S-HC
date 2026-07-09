from __future__ import annotations

import json
from pathlib import Path

import pyopencl as cl


DEVICE_TYPE_NAMES = {
    cl.device_type.CPU: "CPU",
    cl.device_type.GPU: "GPU",
    cl.device_type.ACCELERATOR: "ACCELERATOR",
    cl.device_type.DEFAULT: "DEFAULT",
    cl.device_type.CUSTOM: "CUSTOM",
}


def device_type_name(device: cl.Device) -> str:
    for type_flag, name in DEVICE_TYPE_NAMES.items():
        if device.type & type_flag:
            return name
    return f"UNKNOWN ({device.type})"


def collect_device_info(device: cl.Device) -> dict[str, object]:
    return {
        "platform": device.platform.name.strip(),
        "name": device.name.strip(),
        "vendor": device.vendor.strip(),
        "type": device_type_name(device),
        "driver_version": getattr(device, "driver_version", "unknown"),
        "opencl_c_version": getattr(device, "opencl_c_version", "unknown"),
        "global_mem_size_bytes": int(device.global_mem_size),
        "local_mem_size_bytes": int(device.local_mem_size),
        "max_compute_units": int(device.max_compute_units),
        "max_work_group_size": int(device.max_work_group_size),
        "max_clock_frequency_mhz": int(device.max_clock_frequency),
        "max_mem_alloc_size_bytes": int(device.max_mem_alloc_size),
    }


def print_device_info(device: cl.Device) -> None:
    info = collect_device_info(device)
    print("Selected OpenCL device")
    print(f"  Platform: {info['platform']}")
    print(f"  Name: {info['name']}")
    print(f"  Vendor: {info['vendor']}")
    print(f"  Type: {info['type']}")
    print(f"  Driver: {info['driver_version']}")
    print(f"  OpenCL C: {info['opencl_c_version']}")
    print(f"  Global memory: {info['global_mem_size_bytes'] / 1024**3:.2f} GiB")
    print(f"  Local memory: {info['local_mem_size_bytes'] / 1024:.1f} KiB")
    print(f"  Compute units: {info['max_compute_units']}")
    print(f"  Max work-group size: {info['max_work_group_size']}")
    print(f"  Max clock frequency: {info['max_clock_frequency_mhz']} MHz")
    print(f"  Max allocation size: {info['max_mem_alloc_size_bytes'] / 1024**2:.2f} MiB")


def save_device_info(device: cl.Device, path: str | Path) -> None:
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(collect_device_info(device), indent=2),
        encoding="utf-8",
    )
