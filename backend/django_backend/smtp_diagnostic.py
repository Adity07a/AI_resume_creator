import smtplib
import ssl

from django.conf import settings

options = settings.MAILERS["default"]["OPTIONS"]
host = options["host"]
username = options["username"]
password = options["password"]


def test_smtp(name, port, use_ssl):
    print(f"\nTesting {name} on port {port}...")

    try:
        if use_ssl:
            connection = smtplib.SMTP_SSL(
                host,
                port,
                timeout=20,
                context=ssl.create_default_context(),
            )
        else:
            connection = smtplib.SMTP(
                host,
                port,
                timeout=20,
            )

        with connection as server:
            server.ehlo()

            if not use_ssl:
                server.starttls(
                    context=ssl.create_default_context()
                )
                server.ehlo()

            print("Secure connection established.")
            print("Attempting SMTP authentication...")

            server.login(username, password)

            print("SUCCESS: SMTP authentication worked.")

    except smtplib.SMTPAuthenticationError as exc:
        print("Authentication rejected:", exc.smtp_code)
        print(
            exc.smtp_error.decode(errors="replace")
            if isinstance(exc.smtp_error, bytes)
            else exc.smtp_error
        )

    except smtplib.SMTPServerDisconnected:
        print("The SMTP server disconnected unexpectedly.")

    except (smtplib.SMTPException, OSError, TimeoutError) as exc:
        print("SMTP error:", type(exc).__name__, str(exc))


test_smtp("Gmail STARTTLS", 587, False)
test_smtp("Gmail SSL", 465, True)