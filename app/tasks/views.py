import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods

from .models import Task


@require_GET
def health(request):
    return JsonResponse({
        "status": "healthy",
        "service": "task-api",
    })


@csrf_exempt
@require_http_methods(["GET", "POST"])
def task_list(request):
    if request.method == "GET":
        tasks = [
            {
                "id": task.id,
                "title": task.title,
                "completed": task.completed,
                "created_at": task.created_at.isoformat(),
            }
            for task in Task.objects.order_by("-created_at")
        ]
        return JsonResponse({"tasks": tasks})

    try:
        payload = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    if not isinstance(payload, dict):
        return JsonResponse({"error": "Expected a JSON object"}, status=400)

    title = payload.get("title")

    if not isinstance(title, str) or not title.strip():
        return JsonResponse(
            {"error": "A non-empty title is required"},
            status=400,
        )

    if len(title.strip()) > 200:
        return JsonResponse(
            {"error": "Title must be 200 characters or fewer"},
            status=400,
        )

    task = Task.objects.create(title=title.strip())

    return JsonResponse(
        {
            "id": task.id,
            "title": task.title,
            "completed": task.completed,
            "created_at": task.created_at.isoformat(),
        },
        status=201,
    )
