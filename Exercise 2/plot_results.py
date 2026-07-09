from __future__ import annotations

import csv
from pathlib import Path

import matplotlib.pyplot as plt


def read_csv_rows(path: str | Path) -> list[dict[str, str]]:
    with Path(path).open("r", newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def save_access_pattern_plot(csv_path: str | Path, output_path: str | Path) -> None:
    rows = read_csv_rows(csv_path)
    labels = []
    values = []
    for row in rows:
        pattern = row["pattern"]
        stride = int(row["stride"])
        label = pattern if pattern != "strided" else f"stride {stride}"
        labels.append(label)
        values.append(float(row["gbps"]))

    fig, ax = plt.subplots(figsize=(10, 5))
    ax.bar(labels, values, color="#2c7fb8")
    ax.set_title("Effective Bandwidth vs Access Pattern")
    ax.set_ylabel("Bandwidth (GB/s)")
    ax.set_xlabel("Access pattern")
    ax.grid(axis="y", linestyle="--", alpha=0.35)
    fig.tight_layout()
    fig.savefig(output_path, dpi=160)
    plt.close(fig)


def save_scaling_plot(csv_path: str | Path, output_path: str | Path) -> None:
    rows = read_csv_rows(csv_path)
    sizes = [int(row["n"]) for row in rows]
    values = [float(row["gbps"]) for row in rows]

    fig, ax = plt.subplots(figsize=(10, 5))
    ax.plot(sizes, values, marker="o", linewidth=2, color="#1d91c0")
    ax.set_title("Effective Bandwidth vs Problem Size")
    ax.set_ylabel("Bandwidth (GB/s)")
    ax.set_xlabel("Number of elements")
    ax.grid(True, linestyle="--", alpha=0.35)
    fig.tight_layout()
    fig.savefig(output_path, dpi=160)
    plt.close(fig)


def save_workgroup_plot(csv_path: str | Path, output_path: str | Path) -> None:
    rows = read_csv_rows(csv_path)
    sizes = [int(row["local_size"]) for row in rows]
    values = [float(row["gbps"]) for row in rows]

    fig, ax = plt.subplots(figsize=(10, 5))
    ax.plot(sizes, values, marker="o", linewidth=2, color="#41ab5d")
    ax.set_title("Effective Bandwidth vs Work-Group Size")
    ax.set_ylabel("Bandwidth (GB/s)")
    ax.set_xlabel("Work-group size")
    ax.grid(True, linestyle="--", alpha=0.35)
    fig.tight_layout()
    fig.savefig(output_path, dpi=160)
    plt.close(fig)
