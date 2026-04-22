import sys
from PIL import Image
from io import BytesIO
from django.core.files.uploadedfile import InMemoryUploadedFile

def compress_image_to_webp(imagine_file, max_width=1920, quality=85):
    """
    resize if width > max_width
    save as webp
    return new InMemoryUploadedFile which can be saved by django
    """

    img = Image.open(imagine_file)
    
    if img.width > max_width:
        ratio = max_width / img.width
        new_height = int(img.height * ratio)
        img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)

    buffer = BytesIO()
    img.save(buffer, format="WEBP", quality=quality)
    buffer.seek(0)

    return InMemoryUploadedFile(
        file=buffer,
        field_name=imagine_file.field_name,
        name=imagine_file.name.rsplit(".", 1)[0] + ".webp",
        content_type="image/webp",
        size=sys.getsizeof(buffer),
        charset=None,
    )
    