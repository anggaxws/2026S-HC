STREAM_KERNEL_SOURCE = r"""
__kernel void stream_kernel(
    __global const float *a,
    __global float *b,
    __global const int *idx,
    const float c,
    const int n)
{
    int i = get_global_id(0);

    if (i < n) {
        int j = idx[i];
        b[i] = a[j] * c;
    }
}
"""
