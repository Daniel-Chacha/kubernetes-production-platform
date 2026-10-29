
import json

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from .models import Task


User = get_user_model()


class HealthEndpointTests(TestCase):
    def test_health_returns_healthy_status(self):
        response = self.client.get("/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "healthy")


class TaskEndpointTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            password="test-password-for-ci",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_list_tasks(self):
        Task.objects.create(
            title="Test deployment",
            user=self.user,
        )

        response = self.client.get("/api/tasks/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["tasks"]), 1)
        self.assertEqual(
            response.json()["tasks"][0]["title"],
            "Test deployment",
        )

    def test_users_only_see_their_own_tasks(self):
        other_user = User.objects.create_user(
            username="anotheruser",
            password="another-test-password",
        )
        Task.objects.create(title="My task", user=self.user)
        Task.objects.create(
            title="Another user's task",
            user=other_user,
        )

        response = self.client.get("/api/tasks/")

        self.assertEqual(response.status_code, 200)
        tasks = response.json()["tasks"]
        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0]["title"], "My task")

    def test_create_task(self):
        response = self.client.post(
            "/api/tasks/",
            data=json.dumps({"title": "Build container"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["title"], "Build container")
        self.assertEqual(
            Task.objects.get(id=response.json()["id"]).user,
            self.user,
        )

    def test_reject_empty_title(self):
        response = self.client.post(
            "/api/tasks/",
            data=json.dumps({"title": "  "}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)