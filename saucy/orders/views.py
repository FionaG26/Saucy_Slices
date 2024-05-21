from django.shortcuts import render
from django.http import JsonResponse
from .models import Order, OrderItem

def order_list(request):
    orders = Order.objects.filter(user=request.user)
    # Serialize orders data
    return JsonResponse({'orders': list(orders.values())}, status=200)

def order_detail(request, order_id):
    try:
        order = Order.objects.get(pk=order_id, user=request.user)
        # Serialize order data
        return JsonResponse({'order': order}, status=200)
    except Order.DoesNotExist:
        return JsonResponse({'error': 'Order not found'}, status=404)
