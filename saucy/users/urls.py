from django.urls import path
from . import views


urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('register/', views.register_view, name='register'),
    path('password/reset/', views.reset_password_view, name='reset_password'),
    path('user/profile/', views.user_profile_view, name='user_profile'),
    path('user/profile/update/', views.update_user_profile_view, name='update_user_profile'),
    path('user/orders/', views.order_history_view, name='order_history'),
    path('wishlist/add/', views.add_to_wishlist_view, name='add_to_wishlist'),
]

