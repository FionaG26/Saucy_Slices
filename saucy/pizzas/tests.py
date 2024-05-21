from django.test import TestCase
from .models import Pizza

# Create your tests here.
class PizzaModelTest(TestCase):
    def test_pizza_creation(self):
        pizza = Pizza.objects.create(name="Margherita Pizza", product_id="PIZZA001", price=9.99)
        self.assertEqual(str(pizza), pizza.name)

