import json

from django.test import TestCase

from .models import Task


class HealthEndpointTests(TestCase):
    def test_health_returns_healthy_status(self):
        response = self.client.get("/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "healthy")


class TaskEndpointTests(TestCase):
    def test_list_tasks(self):
        Task.objects.create(title="Test deployment")

        response = self.client.get("/api/tasks/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["tasks"]), 1)

    def test_create_task(self):
        response = self.client.post(
            "/api/tasks/",
            data=json.dumps({"title": "Build container"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["title"], "Build container")

    def test_reject_empty_title(self):
        response = self.client.post(
            "/api/tasks/",
            data=json.dumps({"title": "  "}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
