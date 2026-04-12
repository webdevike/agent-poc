import modal

app = modal.App("code-sandbox")

sandbox_image = modal.Image.debian_slim(python_version="3.12").pip_install(
    "numpy", "pandas", "requests"
)


@app.function()
@modal.fastapi_endpoint(method="POST")
def execute(data: dict):
    """Execute code in an isolated Modal sandbox.

    Accepts JSON: {"code": "print('hello')", "timeout": 30}
    Returns: {"stdout": "...", "stderr": "...", "exit_code": 0}
    """
    code = data.get("code", "")
    timeout = min(data.get("timeout", 30), 120)  # cap at 2 minutes

    if not code.strip():
        return {"stdout": "", "stderr": "No code provided", "exit_code": 1}

    sb = modal.Sandbox.create(
        "python",
        "-c",
        code,
        image=sandbox_image,
        timeout=timeout,
        app=app,
    )
    sb.wait()

    return {
        "stdout": sb.stdout.read(),
        "stderr": sb.stderr.read(),
        "exit_code": sb.returncode,
    }


@app.local_entrypoint()
def main(code: str = "print('Hello from the sandbox!')"):
    """Run code via the CLI: modal run sandbox.py --code 'print(1+1)'"""
    sb = modal.Sandbox.create(
        "python",
        "-c",
        code,
        image=sandbox_image,
        timeout=30,
        app=app,
    )
    sb.wait()

    stdout = sb.stdout.read()
    stderr = sb.stderr.read()

    if stdout:
        print(stdout)
    if stderr:
        print(f"[stderr] {stderr}")
    print(f"[exit code] {sb.returncode}")
