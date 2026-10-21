
from django.http import JsonResponse
from django.views.decorators.http import require_GET

from rest_framework import status
from rest_framework.decorators import (
    api_view,
    permission_classes,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Task


@require_GET
def health(request):
    return JsonResponse({
        "status": "healthy",
        "service": "task-api",
    })


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def task_list(request):
    if request.method == "GET":
        tasks = [
            {
                "id": task.id,
                "title": task.title,
                "completed": task.completed,
                "created_at": task.created_at.isoformat(),
            }
            for task in Task.objects.filter(
                user=request.user
            ).order_by("-created_at")
        ]
        return Response({"tasks": tasks})

    payload = request.data

    if not isinstance(payload, dict):
        return Response(
            {"error": "Expected a JSON object"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    title = payload.get("title")

    if not isinstance(title, str) or not title.strip():
        return Response(
            {"error": "A non-empty title is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    title = title.strip()

    if len(title) > 200:
        return Response(
            {"error": "Title must be 200 characters or fewer"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    task = Task.objects.create(
        user=request.user,
        title=title,
    )

    return Response(
        {
            "id": task.id,
            "title": task.title,
            "completed": task.completed,
            "created_at": task.created_at.isoformat(),
        },
        status=status.HTTP_201_CREATED,
    )

