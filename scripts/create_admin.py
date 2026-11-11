#!/usr/bin/env python3

import json
import getpass
import urllib.request
import urllib.error
import sys


def api_request(url, key, method, endpoint, payload=None):
    data = None if payload is None else json.dumps(payload).encode("utf-8")

    request = urllib.request.Request(
        url.rstrip("/") + endpoint,
        data=data,
        method=method,
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Prefer": "return=minimal",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            body = response.read()
            return json.loads(body) if body else None
    except urllib.error.HTTPError as error:
        details = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(details or f"HTTP error {error.code}")


def main():
    print("\n================================")
    print("     BRAINY US ADMIN CREATOR")
    print("================================\n")

    url = input("Supabase project URL: ").strip().rstrip("/")
    key = getpass.getpass("Supabase service_role/secret key: ").strip()

    if not url.startswith("https://") or not key:
        print("\nInvalid project URL or secret key.")
        sys.exit(1)

    email = input("\nAdministrator email: ").strip().lower()
    password = getpass.getpass("Administrator password: ")
    confirmation = getpass.getpass("Confirm password: ")

    if not email or "@" not in email:
        print("\nPlease enter a valid email address.")
        sys.exit(1)

    if len(password) < 8:
        print("\nPassword must contain at least 8 characters.")
        sys.exit(1)

    if password != confirmation:
        print("\nPasswords do not match.")
        sys.exit(1)

    print("\nCreating administrator account...")

    try:
        user = api_request(
            url,
            key,
            "POST",
            "/auth/v1/admin/users",
            {
                "email": email,
                "password": password,
                "email_confirm": True,
            },
        )

        user_id = user.get("id")

        if not user_id:
            raise RuntimeError("Supabase did not return a user ID.")

        print("Authentication account created.")
        print("Registering administrator permissions...")

        try:
            api_request(
                url,
                key,
                "POST",
                "/rest/v1/admin_users",
                {"user_id": user_id},
            )
        except Exception:
            print("Admin registration failed. Rolling back Auth account...")
            try:
                api_request(
                    url,
                    key,
                    "DELETE",
                    f"/auth/v1/admin/users/{user_id}",
                )
                print("Temporary Auth account deleted.")
            except Exception:
                print("WARNING: Could not automatically delete the Auth account.")
            raise

        print("\nSUCCESS!")
        print("Administrator account created.")
        print(f"Email: {email}")
        print(f"User ID: {user_id}")
        print("\nYou can now sign in at /admin.")

    except Exception as error:
        print("\nFAILED:", error)
        sys.exit(1)


if __name__ == "__main__":
    main()
