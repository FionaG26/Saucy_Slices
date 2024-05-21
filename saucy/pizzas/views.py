from django.shortcuts import render
from django.http import JsonResponse
from .models import Pizza

def pizza_list(request):
    pizzas = Pizza.objects.all()
    # Serialize pizza data
    return JsonResponse({'pizzas': list(pizzas.values())}, status=200)

def pizza_detail(request, pizza_id):
    try:
        pizza = Pizza.objects.get(pk=pizza_id)
        # Serialize pizza data
        return JsonResponse({'pizza': pizza}, status=200)
    except Pizza.DoesNotExist:
        return JsonResponse({'error': 'Pizza not found'}, status=404)
