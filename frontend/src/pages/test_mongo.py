import psutil

try:
    proc = psutil.Process(22356)
    print("CommandLine:")
    print(" ".join(proc.cmdline()))
except Exception as e:
    print("Error:", e)
