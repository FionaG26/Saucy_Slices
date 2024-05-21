from django.urls import path
from . import views


urlpatterns = [
    path('', views.product_list_view, name='product_list'),
    path('<str:product_id>/', views.product_detail_view, name='product_detail'),
    path('search/', views.product_search_view, name='product_search'),
]
