from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('pizza/<str:id>/', views.pizza_detail, name='pizza_detail'),
]
