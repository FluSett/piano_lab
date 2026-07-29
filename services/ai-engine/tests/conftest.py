import sys
from pathlib import Path

# Setup workspace root in sys.path for test fixture access
workspace_root = Path(__file__).resolve().parent.parent.parent.parent
if str(workspace_root) not in sys.path:
    sys.path.insert(0, str(workspace_root))
