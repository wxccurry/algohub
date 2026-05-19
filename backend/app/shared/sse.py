import asyncio
import json
import logging
from typing import AsyncGenerator

logger = logging.getLogger("algohub.sse")


class SSEManager:
    """Manages SSE connections per submission_id using in-memory asyncio.Queue."""

    def __init__(self):
        # submission_id → list of asyncio.Queue
        self._subscribers: dict[int, list[asyncio.Queue]] = {}

    def subscribe(self, submission_id: int) -> asyncio.Queue:
        queue = asyncio.Queue()
        if submission_id not in self._subscribers:
            self._subscribers[submission_id] = []
        self._subscribers[submission_id].append(queue)
        return queue

    def unsubscribe(self, submission_id: int, queue: asyncio.Queue):
        if submission_id in self._subscribers:
            self._subscribers[submission_id] = [q for q in self._subscribers[submission_id] if q is not queue]
            if not self._subscribers[submission_id]:
                del self._subscribers[submission_id]

    async def publish(self, submission_id: int, event_type: str, data: dict):
        """Publish an event to all subscribers of a submission."""
        if submission_id in self._subscribers:
            payload = json.dumps({"type": event_type, "data": data})
            dead_queues = []
            for queue in self._subscribers[submission_id]:
                try:
                    queue.put_nowait(payload)
                except asyncio.QueueFull:
                    dead_queues.append(queue)
            for q in dead_queues:
                self.unsubscribe(submission_id, q)
            logger.info(
                "SSE published",
                extra={
                    "submission_id": submission_id,
                    "type": event_type,
                    "subscribers": len(self._subscribers.get(submission_id, [])),
                },
            )

    async def stream(self, submission_id: int) -> AsyncGenerator[str, None]:
        """Async generator yielding SSE-formatted events."""
        queue = self.subscribe(submission_id)
        try:
            while True:
                try:
                    payload = await asyncio.wait_for(queue.get(), timeout=30)
                    yield f"data: {payload}\n\n"
                except asyncio.TimeoutError:
                    yield f"data: {json.dumps({'type': 'heartbeat', 'data': {}})}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            self.unsubscribe(submission_id, queue)


# Global singleton
sse_manager = SSEManager()
