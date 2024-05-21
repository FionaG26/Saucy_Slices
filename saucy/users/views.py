from django.shortcuts import render
from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import User


@csrf_exempt
def login_view(request):
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return JsonResponse({'message': 'Login successful'}, status=200)
        else:
            return JsonResponse({'error': 'Invalid credentials'}, status=400)
    return JsonResponse({'error': 'Invalid request method'}, status=405)

@csrf_exempt
def logout_view(request):
    if request.method == 'POST':
        logout(request)
        return JsonResponse({'message': 'Logout successful'}, status=200)
    return JsonResponse({'error': 'Invalid request method'}, status=405)

@csrf_exempt
def register_view(request):
    if request.method == 'POST':
        # Registration logic here
        return JsonResponse({'message': 'Registration successful'}, status=201)
    return JsonResponse({'error': 'Invalid request method'}, status=405)

@csrf_exempt
def reset_password_view(request):
    if request.method == 'POST':
        # Password reset logic here
        return JsonResponse({'message': 'Password reset successful'}, status=200)
    return JsonResponse({'error': 'Invalid request method'}, status=405)

@csrf_exempt
def user_profile_view(request):
    if request.user.is_authenticated:
        # Fetch and return user profile data
        return JsonResponse({'user': request.user.username}, status=200)
    return JsonResponse({'error': 'User not authenticated'}, status=401)

@csrf_exempt
def update_user_profile_view(request):
    if request.method == 'POST' and request.user.is_authenticated:
        # Update user profile logic here
        return JsonResponse({'message': 'Profile updated successfully'}, status=200)
    return JsonResponse({'error': 'Invalid request or user not authenticated'}, status=405)

@csrf_exempt
def order_history_view(request):
    if request.user.is_authenticated:
        # Fetch and return user's order history
        return JsonResponse({'orders': []}, status=200)
    return JsonResponse({'error': 'User not authenticated'}, status=401)

@csrf_exempt
def add_to_wishlist_view(request):
    if request.method == 'POST' and request.user.is_authenticated:
        # Add to wishlist logic here
        return JsonResponse({'message': 'Item added to wishlist'}, status=200)
    return JsonResponse({'error': 'Invalid request or user not authenticated'}, status=405)
