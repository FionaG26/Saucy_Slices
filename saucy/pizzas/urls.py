from django.urls import path
from . import views

urlpatterns = [
    path('', views.pizza_list, name='pizza_list'),
    path('<int:pizza_id>/', views.pizza_detail, name='pizza_detail'),
]
