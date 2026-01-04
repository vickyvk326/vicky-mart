1. Middleware: Pre-processes the raw packet (Cookies, CORS).

2. Guards: Checks "Who are you?" (Authentication).

3. Interceptors (Pre): Checks "Do I have this in Cache?"

4. Pipes: Checks "Is your data valid?" (Validation).

5. Controller: "Do the work."

6. Interceptors (Post): "Clean the data and wrap it in a success JSON."

7. Filters: Handle exceptions globally
