"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path

from tasks.views import health, task_list
from tasks.auth_views import (
    LoginView,
    LogoutView,
    RefreshView,
    RegisterView,
    MeView
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('health/', health, name='health'),
    path('api/tasks/', task_list, name='task-list'),
    path("api/auth/register/", RegisterView.as_view(), name="auth-register"),
    path("api/auth/token/", LoginView.as_view(), name="auth-token"),
    path("api/auth/token/refresh/", RefreshView.as_view(), name="auth-token-refresh"),
    path("api/auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("api/auth/me/", MeView.as_view(), name="auth-me"),
]
