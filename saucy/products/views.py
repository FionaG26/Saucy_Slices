from django.http import JsonResponse
from .models import Product  

def product_list_view(request):
    products = Product.objects.all()
    # Serialize product data
    return JsonResponse({'products': list(products.values())}, status=200)

def product_detail_view(request, product_id):
    try:
        product = Product.objects.get(id=product_id)
        # Serialize product data
        return JsonResponse({'product': product}, status=200)
    except Product.DoesNotExist:
        return JsonResponse({'error': 'Product not found'}, status=404)

def product_search_view(request):
    query = request.GET.get('q', '')
    products = Product.objects.filter(name__icontains=query)
    # Serialize search results
    return JsonResponse({'products': list(products.values())}, status=200)
