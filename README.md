# Saucy Slices

Saucy Slices is a web application for selling pizzas online. It is built using Django, a high-level Python web framework that encourages rapid development and clean, pragmatic design.

## Table of Contents

- [Project Structure](#project-structure)
- [Installation](#installation)
- [Usage](#usage)
- [License](#license)

## Project Structure

```
Saucy_Slices/
│
├── LICENSE # License file for the project
├── env/ # Directory for virtual environment (contains environment-specific files and folders)
│
├── saucy/ # Main Django project directory
│ ├── init.py # Initializes the Django project
│ ├── manage.py # Command-line utility for administrative tasks
│ ├── saucy_slices_db/ # Database directory (likely for SQLite DB or database related files)
│ │
│ ├── assets/ # Static assets like fonts, icons, etc.
│ ├── css/ # CSS files for styling
│ ├── images/ # Image files
│ ├── templates/ # Static HTML templates
│ │
│ ├── static/ # Directory for project-wide static files (empty after moving)
│ │
│ ├── cart/ # Django app for managing the shopping cart
│ │ ├── init.py
│ │ ├── admin.py
│ │ ├── apps.py
│ │ ├── migrations/
│ │ ├── models.py
│ │ ├── tests.py
│ │ ├── views.py
│ │ ├── urls.py (recommended)
│ │ ├── static/
│ │ ├── templates/
│ │
│ ├── orders/ # Django app for managing orders
│ │ ├── init.py
│ │ ├── admin.py
│ │ ├── apps.py
│ │ ├── migrations/
│ │ ├── models.py
│ │ ├── tests.py
│ │ ├── views.py
│ │ ├── urls.py (recommended)
│ │ ├── static/
│ │ ├── templates/
│ │
│ ├── pizzas/ # Django app for managing pizzas
│ │ ├── init.py
│ │ ├── admin.py
│ │ ├── apps.py
│ │ ├── migrations/
│ │ ├── models.py
│ │ ├── static/
│ │ ├── tests.py
│ │ ├── urls.py
│ │ ├── views.py
│ │ ├── templates/
│ │
│ ├── users/ # Django app for managing users
│ │ ├── init.py
│ │ ├── admin.py
│ │ ├── apps.py
│ │ ├── migrations/
│ │ ├── models.py
│ │ ├── tests.py
│ │ ├── views.py
│ │ ├── urls.py (recommended)
│ │ ├── static/
│ │ ├── templates/
│ │
│ ├── saucy/ # Project-specific settings and configurations
│ │ ├── init.py
│ │ ├── asgi.py
│ │ ├── settings.py
│ │ ├── urls.py
│ │ ├── wsgi.py
│ │
│ └── templates/ # Directory for project-wide HTML templates
│ ├── index.html # Main template for the whole project
│ ├── base.html # Base template containing common elements (optional but recommended)
│ └── ... # Other templates for specific pages or components
│
└── manage.py # Django's command-line utility for administrative tasks
```

## Installation

To get a copy of the project up and running on your local machine for development and testing purposes, follow these steps:

1. **Clone the repository:**

    ```bash
    git clone https://github.com/FionaG26/Saucy_Slices.git
    cd Saucy_Slices
    ```

2. **Set up a virtual environment:**

    ```bash
    python -m venv env
    source env/bin/activate  # On Windows, use `env\Scripts\activate`
    ```

3. **Install the dependencies:**

    ```bash
    pip install -r requirements.txt
    ```

4. **Apply migrations:**

    ```bash
    python manage.py migrate
    ```

5. **Run the development server:**

    ```bash
    python manage.py runserver
    ```

6. Open your web browser and go to `http://127.0.0.1:8000/` to see the application running.

## Usage

- **Admin Panel:** Go to `http://127.0.0.1:8000/admin/` to access the admin panel (you need to create a superuser first by running `python manage.py createsuperuser`).
- **Cart:** Manage the shopping cart.
- **Orders:** Manage pizza orders.
- **Pizzas:** Manage the pizza menu.
- **Users:** Manage user accounts.

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/FionaG26/Saucy_Slices/blob/main/LICENSE) file for details.
