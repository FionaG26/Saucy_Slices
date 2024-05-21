from django.urls import path
from . import views

urlpatterns = [
    path('add/', views.add_to_cart_view, name='add_to_cart'),
    path('update/', views.update_cart_view, name='update_cart'),
    path('remove/<int:item_id>/', views.remove_from_cart_view, name='remove_from_cart'),
    path('checkout/initiate/', views.initiate_checkout_view, name='initiate_checkout'),
    path('checkout/place-order/', views.place_order_view, name='place_order'),
    path('order/<int:order_id>/status/', views.order_status_view, name='order_status'),
]
