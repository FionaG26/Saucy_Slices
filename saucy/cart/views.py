from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Cart, CartItem
from products.models import Product
from django.contrib.auth.decorators import login_required

@csrf_exempt
def add_to_cart_view(request):
    if request.method == 'POST' and request.user.is_authenticated:
        product_id = request.POST.get('product_id')
        quantity = int(request.POST.get('quantity', 1))
        product = Product.objects.get(id=product_id)

        cart, created = Cart.objects.get_or_create(user=request.user)
        cart_item, created = CartItem.objects.get_or_create(cart=cart, product=product)
        cart_item.quantity += quantity
        cart_item.save()

        return JsonResponse({'message': 'Item added to cart'}, status=200)
    return JsonResponse({'error': 'Invalid request or user not authenticated'}, status=405)

@csrf_exempt
def update_cart_view(request):
    if request.method == 'POST' and request.user.is_authenticated:
        item_id = request.POST.get('item_id')
        quantity = int(request.POST.get('quantity', 1))
        cart_item = CartItem.objects.get(id=item_id)

        if cart_item.cart.user == request.user:
            cart_item.quantity = quantity
            cart_item.save()
            return JsonResponse({'message': 'Cart updated'}, status=200)
        else:
            return JsonResponse({'error': 'Unauthorized'}, status=403)
    return JsonResponse({'error': 'Invalid request or user not authenticated'}, status=405)

@csrf_exempt
def remove_from_cart_view(request, item_id):
    if request.method == 'DELETE' and request.user.is_authenticated:
        try:
            cart_item = CartItem.objects.get(id=item_id, cart__user=request.user)
            cart_item.delete()
            return JsonResponse({'message': 'Item removed from cart'}, status=200)
        except CartItem.DoesNotExist:
            return JsonResponse({'error': 'Item not found'}, status=404)
    return JsonResponse({'error': 'Invalid request or user not authenticated'}, status=405)

@login_required
@csrf_exempt
def initiate_checkout_view(request):
    if request.method == 'POST':
        # Logic to initiate checkout
        return JsonResponse({'message': 'Checkout initiated'}, status=200)
    return JsonResponse({'error': 'Invalid request method'}, status=405)

@login_required
@csrf_exempt
def place_order_view(request):
    if request.method == 'POST':
        # Logic to place order
        return JsonResponse({'message': 'Order placed'}, status=200)
    return JsonResponse({'error': 'Invalid request method'}, status=405)

@login_required
def order_status_view(request, order_id):
    # Logic to check order status
    return JsonResponse({'order_id': order_id, 'status': 'Order status here'}, status=200)

