def find_parent_process(child_pid):
    """
    Find the parent process of the given child process.
    """
    try:
        parent_pid = int(subprocess.check_output(
            ['ps', '-o', 'ppid=', '-p', str(child_pid)]).decode('utf-8').strip())
    except subprocess.CalledProcessError:
        return None
    return parent_pid


def remove_suffix(folder, suffix):
    for file in os.listdir(folder):
        if file.endswith(suffix):
            os.remove(os.path.join(folder, file))