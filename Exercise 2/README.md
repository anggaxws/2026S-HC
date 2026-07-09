# Uebung 2 - PyOpenCL Memory Benchmark

This project implements the memory-bandwidth benchmark from the HC02 assignment
using Python and PyOpenCL.

## What it does

- queries OpenCL device information
- benchmarks coalesced, strided, and random gather access
- measures effective bandwidth with OpenCL profiling events
- tests scaling with problem size
- tests different work-group sizes
- writes CSV result files
- generates plots for the report

## Project layout

```text
uebung2_pyopencl/
|-- benchmark.py
|-- device_info.py
|-- kernels.py
|-- main.py
|-- plot_results.py
|-- requirements.txt
|-- results/
|   `-- .gitkeep
`-- report/
```

## Setup

```bash
pip install -r requirements.txt
```

Make sure an OpenCL runtime and a compatible device are available on your
system.

## Run

```bash
python main.py
```

Optional examples:

```bash
python main.py --device gpu
python main.py --device any --access-size 33554432
python main.py --device gpu --repeats 9 --warmups 2
```

## Output

The script stores results in `results/`:

- `access_patterns.csv`
- `scaling.csv`
- `workgroup_sizes.csv`
- `access_patterns.png`
- `scaling.png`
- `workgroup_sizes.png`
- `device_info.json`
