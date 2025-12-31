"""
Service d'envoi d'emails
Gère l'envoi d'emails avec SMTP (Gmail)
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from pathlib import Path
from typing import Optional
from app.config.settings import settings


def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    attachments: Optional[list] = None
) -> bool:
    """
    Envoyer un email HTML avec pièces jointes optionnelles

    Args:
        to_email: Email du destinataire
        subject: Sujet de l'email
        html_content: Contenu HTML de l'email
        attachments: Liste de chemins de fichiers à attacher (optionnel)

    Returns:
        bool: True si envoyé avec succès, False sinon

    Exemple:
        >>> success = send_email(
        ...     to_email="user@example.com",
        ...     subject="Votre billet",
        ...     html_content="<h1>Bonjour!</h1>",
        ...     attachments=["uploads/qrcodes/abc123.png"]
        ... )
    """

    # ÉTAPE 1 : Vérifier la configuration SMTP
    if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print("Configuration SMTP manquante. Emails désactivés.")
        return False

    try:
        # ÉTAPE 2 : Créer le message
        message = MIMEMultipart("alternative")
        message["From"] = settings.SMTP_USER
        message["To"] = to_email
        message["Subject"] = subject

        # ÉTAPE 3 : Ajouter le contenu HTML
        html_part = MIMEText(html_content, "html", "utf-8")
        message.attach(html_part)

        # ÉTAPE 4 : Ajouter les pièces jointes si présentes
        if attachments:
            for file_path in attachments:
                path = Path(file_path)
                if path.exists():
                    with open(path, "rb") as f:
                        img = MIMEImage(f.read())
                        img.add_header(
                            "Content-Disposition",
                            f"attachment; filename={path.name}"
                        )
                        message.attach(img)

        # ÉTAPE 5 : Se connecter au serveur SMTP et envoyer
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()  # Sécuriser la connexion
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(message)

        print(f"Email envoyé à {to_email}")
        return True

    except Exception as e:
        print(f"Erreur lors de l'envoi de l'email à {to_email}: {e}")
        return False


def send_registration_confirmation_email(
    to_email: str,
    participant_name: str,
    event_title: str,
    event_date: str,
    event_location: Optional[str],
    event_format: str,
    qr_code_url: str,
    qr_code_path: str,
    virtual_meeting_url: Optional[str] = None,
    virtual_meeting_id: Optional[str] = None,
    virtual_meeting_password: Optional[str] = None,
    virtual_platform: Optional[str] = None,
    virtual_instructions: Optional[str] = None
) -> bool:
    """
    Envoyer un email de confirmation d'inscription avec le billet (QR code)

    Args:
        to_email: Email du participant
        participant_name: Nom complet du participant
        event_title: Titre de l'événement
        event_date: Date formatée de l'événement
        event_location: Lieu (si physique/hybride)
        event_format: Format (physical, virtual, hybrid)
        qr_code_url: URL complète du QR code
        qr_code_path: Chemin local du QR code
        virtual_meeting_url: Lien de la réunion virtuelle (optionnel)
        virtual_meeting_id: ID de la réunion (optionnel)
        virtual_meeting_password: Mot de passe de la réunion (optionnel)
        virtual_platform: Plateforme (zoom, google_meet, etc.)
        virtual_instructions: Instructions pour rejoindre (optionnel)

    Returns:
        bool: True si envoyé, False sinon
    """

    # ÉTAPE 1 : Générer le contenu HTML
    html_content = f"""
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirmation d'inscription</title>
        <style>
            body {{
                font-family: Arial, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
            }}
            .container {{
                max-width: 600px;
                margin: 20px auto;
                background-color: #ffffff;
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }}
            .header {{
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                text-align: center;
            }}
            .header h1 {{
                margin: 0;
                font-size: 28px;
            }}
            .content {{
                padding: 30px;
            }}
            .event-info {{
                background-color: #f8f9fa;
                border-left: 4px solid #667eea;
                padding: 15px;
                margin: 20px 0;
            }}
            .event-info p {{
                margin: 8px 0;
                color: #333;
            }}
            .qr-section {{
                text-align: center;
                margin: 30px 0;
                padding: 20px;
                background-color: #f8f9fa;
                border-radius: 8px;
            }}
            .qr-section img {{
                max-width: 250px;
                border: 3px solid #667eea;
                border-radius: 8px;
                padding: 10px;
                background-color: white;
            }}
            .footer {{
                background-color: #f8f9fa;
                padding: 20px;
                text-align: center;
                color: #666;
                font-size: 12px;
            }}
            .btn {{
                display: inline-block;
                padding: 12px 24px;
                background-color: #667eea;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                margin: 10px 0;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <!-- Header -->
            <div class="header">
                <h1>🎉 Inscription confirmée !</h1>
                <p>Votre billet pour {event_title}</p>
            </div>

            <!-- Content -->
            <div class="content">
                <p>Bonjour <strong>{participant_name}</strong>,</p>

                <p>Félicitations ! Votre inscription à l'événement <strong>{event_title}</strong> a été confirmée avec succès.</p>

                <!-- Event Info -->
                <div class="event-info">
                    <p><strong>Date :</strong> {event_date}</p>
                    {"<p><strong>Lieu :</strong> " + event_location + "</p>" if event_location else ""}
                    {"<p><strong>Format :</strong> Événement " + ("virtuel" if event_format == "virtual" else "hybride (en ligne + sur place)") + "</p>" if event_format in ["virtual", "hybrid"] else ""}
                </div>

                <!-- Virtual Meeting Info -->
                {"""
                <div style="margin: 20px 0; padding: 20px; background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%); border-radius: 10px; border: 2px solid #3b82f6;">
                    <h3 style="margin-top: 0; color: #1e40af;">Informations de connexion</h3>
                    """ + (f"<p><strong>Plateforme :</strong> {virtual_platform.replace('_', ' ').title()}</p>" if virtual_platform else "") +
                    (f"<p><strong>Lien de la réunion :</strong><br><a href='{virtual_meeting_url}' style='color: #2563eb; word-break: break-all;'>{virtual_meeting_url}</a></p>" if virtual_meeting_url else "") +
                    (f"<p><strong>ID de la réunion :</strong> {virtual_meeting_id}</p>" if virtual_meeting_id else "") +
                    (f"<p><strong>Mot de passe :</strong> <code style='background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-family: monospace;'>{virtual_meeting_password}</code></p>" if virtual_meeting_password else "") +
                    (f"<div style='margin-top: 15px; padding: 12px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;'><p style='margin: 0; color: #92400e;'><strong>Instructions :</strong></p><p style='margin: 8px 0 0; color: #92400e;'>{virtual_instructions}</p></div>" if virtual_instructions else "") +
                """
                </div>
                """ if virtual_meeting_url else ""}

                <!-- QR Code Section -->
                <div class="qr-section">
                    <h2>Votre billet électronique</h2>
                    <p>Présentez ce QR code à l'entrée de l'événement</p>
                    <img src="{qr_code_url}" alt="QR Code du billet">
                    <p style="margin-top: 15px; color: #666; font-size: 14px;">
                        <strong>Important :</strong> Ce QR code est unique et ne peut être utilisé qu'une seule fois.
                        <br>Ne le partagez avec personne.
                    </p>
                </div>

                <!-- Instructions -->
                <div style="margin-top: 30px; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                    <p style="margin: 0; color: #856404;"><strong>Instructions importantes :</strong></p>
                    <ul style="color: #856404; margin: 10px 0;">
                        <li>Gardez ce email précieusement</li>
                        <li>Arrivez 15 minutes avant le début</li>
                        <li>Présentez votre QR code à l'entrée</li>
                        {"<li>Pour les événements virtuels, utilisez le lien ci-dessus</li>" if event_format == "virtual" else ""}
                    </ul>
                </div>

                <p style="margin-top: 30px;">
                    Nous avons hâte de vous voir à l'événement !
                </p>

                <p>
                    Cordialement,<br>
                    <strong>L'équipe evMonde</strong>
                </p>
            </div>

            <!-- Footer -->
            <div class="footer">
                <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
                <p>&copy; 2025 evMonde - Plateforme de gestion d'événements</p>
            </div>
        </div>
    </body>
    </html>
    """

    # ÉTAPE 2 : Envoyer l'email avec le QR code en pièce jointe
    subject = f"Votre billet pour {event_title}"

    return send_email(
        to_email=to_email,
        subject=subject,
        html_content=html_content,
        attachments=[qr_code_path]  # Attacher le QR code
    )


def send_organizer_new_registration_email(
    to_email: str,
    organizer_name: str,
    event_title: str,
    participant_name: str,
    participant_email: str,
    registration_status: str
) -> bool:
    html_content = f"""
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Nouvelle inscription</title>
    </head>
    <body style="font-family: Arial, sans-serif; background:#f4f4f4; margin:0; padding:0;">
        <div style="max-width:600px; margin:20px auto; background:#fff; border-radius:10px; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.1);">
            <div style="background:linear-gradient(135deg,#10b981 0%,#059669 100%); color:#fff; padding:24px;">
                <h2 style="margin:0;">Nouvelle inscription</h2>
                <p style="margin:8px 0 0; opacity:0.95;">{event_title}</p>
            </div>
            <div style="padding:24px; color:#111827;">
                <p>Bonjour <strong>{organizer_name}</strong>,</p>
                <p>Une nouvelle inscription vient d'être enregistrée pour votre événement <strong>{event_title}</strong>.</p>
                <div style="background:#f8fafc; border-left:4px solid #10b981; padding:14px; margin:16px 0;">
                    <p style="margin:6px 0;"><strong>Participant :</strong> {participant_name}</p>
                    <p style="margin:6px 0;"><strong>Email :</strong> {participant_email}</p>
                    <p style="margin:6px 0;"><strong>Statut :</strong> {registration_status}</p>
                </div>
                <p style="color:#6b7280; font-size:12px;">Cet email a été envoyé automatiquement.</p>
            </div>
        </div>
    </body>
    </html>
    """

    subject = f"Nouvelle inscription - {event_title}"
    return send_email(to_email=to_email, subject=subject, html_content=html_content)
