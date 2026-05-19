"""Algorithm visualization frame generators.
Each function takes problem input and returns a list of frame dicts.
"""
from typing import Any


def generate_two_pointers(array: list[int], target: int) -> list[dict[str, Any]]:
    """Generate frames for two pointers algorithm (sorted array, find pair sum = target)."""
    frames = []
    arr = sorted(array)
    left, right = 0, len(arr) - 1

    frames.append({
        "step": 0,
        "variables": {"left": left, "right": right, "sum": 0},
        "highlights": [],
        "pointers": {"L": left, "R": right},
        "log": "初始化: left=0, right={}".format(len(arr) - 1),
        "stateSnapshot": {"array": arr},
    })

    step = 1
    while left < right:
        current_sum = arr[left] + arr[right]
        frames.append({
            "step": step,
            "variables": {"left": left, "right": right, "sum": current_sum},
            "highlights": [left, right],
            "pointers": {"L": left, "R": right},
            "log": f"arr[{left}]+arr[{right}]={arr[left]}+{arr[right]}={current_sum}",
            "stateSnapshot": {"array": arr},
        })
        if current_sum == target:
            frames.append({
                "step": step + 1,
                "variables": {"left": left, "right": right, "sum": current_sum, "found": True},
                "highlights": [left, right],
                "pointers": {"L": left, "R": right},
                "log": f"找到! arr[{left}]+arr[{right}]={target}",
                "stateSnapshot": {"array": arr},
            })
            break
        elif current_sum < target:
            left += 1
        else:
            right -= 1
        step += 1

    return frames


def generate_binary_search(array: list[int], target: int) -> list[dict[str, Any]]:
    """Generate frames for binary search."""
    frames = []
    arr = sorted(array)
    left, right = 0, len(arr) - 1

    frames.append({
        "step": 0,
        "variables": {"left": left, "right": right},
        "highlights": [],
        "pointers": {"L": left, "R": right},
        "log": f"在已排序数组中搜索 {target}",
        "stateSnapshot": {"array": arr},
    })

    step = 1
    while left <= right:
        mid = (left + right) // 2
        frames.append({
            "step": step,
            "variables": {"left": left, "right": right, "mid": mid, "mid_val": arr[mid]},
            "highlights": [mid],
            "pointers": {"L": left, "R": right, "M": mid},
            "log": f"mid={mid}, arr[mid]={arr[mid]}, target={target}",
            "stateSnapshot": {"array": arr},
        })
        if arr[mid] == target:
            frames.append({
                "step": step + 1,
                "variables": {"mid": mid, "found": True},
                "highlights": [mid],
                "pointers": {"M": mid},
                "log": f"找到! arr[{mid}]={target}",
                "stateSnapshot": {"array": arr},
            })
            break
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
        step += 1

    if not any(f.get("variables", {}).get("found") for f in frames):
        frames.append({
            "step": step + 1,
            "log": f"未找到 {target}",
            "stateSnapshot": {"array": arr},
        })

    return frames


def generate_bfs_graph(adj_list: dict[int, list[int]], start: int) -> list[dict[str, Any]]:
    """Generate frames for BFS traversal on a graph."""
    frames = []
    nodes = list(adj_list.keys())
    visited = set()
    queue = [start]
    visited_order = []

    frames.append({
        "step": 0,
        "variables": {"queue": [start], "visited": []},
        "highlights": [start],
        "log": f"BFS从节点{start}开始",
        "stateSnapshot": {
            "nodes": [{"id": n} for n in nodes],
            "edges": [{"from": n, "to": v} for n, neighbors in adj_list.items() for v in neighbors],
        },
    })

    step = 1
    while queue:
        node = queue.pop(0)
        visited.add(node)
        visited_order.append(node)

        frames.append({
            "step": step,
            "variables": {"current": node, "queue": list(queue), "visited": list(visited)},
            "highlights": list(visited),
            "log": f"访问节点{node}，队列: {queue}",
            "stateSnapshot": {
                "nodes": [{"id": n} for n in nodes],
                "edges": [{"from": n, "to": v} for n, neighbors in adj_list.items() for v in neighbors],
            },
        })

        for neighbor in adj_list.get(node, []):
            if neighbor not in visited:
                queue.append(neighbor)
                visited.add(neighbor)
        step += 1

    return frames


def generate_dp_knapsack(weights: list[int], values: list[int], capacity: int) -> list[dict[str, Any]]:
    """Generate frames for 0-1 knapsack DP."""
    frames = []
    n = len(weights)
    dp = [[0] * (capacity + 1) for _ in range(n + 1)]

    frames.append({
        "step": 0,
        "variables": {},
        "highlights": [],
        "log": f"0-1背包: {n}个物品, 容量{capacity}",
        "stateSnapshot": {"dp": [row[:] for row in dp]},
    })

    step = 1
    for i in range(1, n + 1):
        for w in range(capacity + 1):
            if weights[i-1] <= w:
                dp[i][w] = max(dp[i-1][w], dp[i-1][w - weights[i-1]] + values[i-1])
            else:
                dp[i][w] = dp[i-1][w]

            frames.append({
                "step": step,
                "variables": {"i": i, "w": w, "val": dp[i][w]},
                "highlights": [[i, w]],
                "log": f"dp[{i}][{w}]={dp[i][w]}",
                "stateSnapshot": {"dp": [row[:] for row in dp]},
            })
            step += 1

    return frames


# Registry
GENERATORS = {
    "two_pointers": generate_two_pointers,
    "binary_search": generate_binary_search,
    "bfs": generate_bfs_graph,
    "dfs": generate_bfs_graph,  # same visualization, different traversal order
    "dp_table": generate_dp_knapsack,
    "sliding_window": generate_two_pointers,  # placeholder
    "sorting": generate_two_pointers,  # placeholder
}


def generate_frames(algorithm_type: str, input_data: dict[str, Any]) -> list[dict[str, Any]]:
    """Generate visualization frames for an algorithm with given input."""
    generator = GENERATORS.get(algorithm_type)
    if not generator:
        raise ValueError(f"Unknown algorithm type: {algorithm_type}")

    if algorithm_type == "two_pointers":
        return generator(input_data["array"], input_data["target"])
    elif algorithm_type == "binary_search":
        return generator(input_data["array"], input_data["target"])
    elif algorithm_type in ("bfs", "dfs"):
        return generator(input_data["adj_list"], input_data["start"])
    elif algorithm_type == "dp_table":
        return generator(input_data["weights"], input_data["values"], input_data["capacity"])
    else:
        return generator(input_data.get("array", []), input_data.get("target", 0))
