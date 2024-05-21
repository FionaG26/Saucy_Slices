from django.urls import path
from . import views


urlpatterns = [
    path('checkout/initiate/', views.initiate_checkout_view, name='initiate_checkout'),
    path('checkout/place-order/', views.place_order_view, name='place_order'),
    path('order/<int:order_id>/status/', views.order_status_view, name='order_status'),
]
