from django.shortcuts import render
from django.http import HttpResponse

# Create your views here.
def home(request):
    # Logic to fetch all available pizzas
    pizzas = Pizza.objects.all()
    return render(request, 'pizza/home.html', {'pizzas': pizzas})


def pizza_detail(request, id):
     # Logic to fetch details of a specific pizza
     pizza = Pizza.objects.get(id=id)
     return render(request, 'pizza/detail.html', {'pizza': pizza})
