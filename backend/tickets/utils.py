from PIL import Image
from io import BytesIO
from django.core.files.uploadedfile import InMemoryUploadedFile


def compress_image_to_webp(image_file, max_width=1920, quality=85):
    """
    compresses and converts an uploaded image to WEBP format.
    raises ValueError if the file is not a valid image.
    """
    try:
        img = Image.open(image_file)
        img.verify()
        image_file.seek(0)
        img = Image.open(image_file)
    except Exception:
        raise ValueError("Uploaded file is not a valid image.")

    if img.mode in ('RGBA', 'P'):
        img = img.convert('RGB')

    if img.width > max_width:
        ratio = max_width / img.width
        new_height = int(img.height * ratio)
        img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)

    buffer = BytesIO()
    img.save(buffer, format="WEBP", quality=quality)
    buffer.seek(0)

    return InMemoryUploadedFile(
        file=buffer,
        field_name='image',
        name=image_file.name.rsplit(".", 1)[0] + ".webp",
        content_type="image/webp",
        size=buffer.getbuffer().nbytes,
        charset=None,
    )