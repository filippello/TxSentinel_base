# Usa una imagen base de Python
FROM python:3.9-slim

# Establece el directorio de trabajo
WORKDIR /app

# Copia el archivo requirements.txt
COPY requirements.txt requirements.txt

# Instala las dependencias necesarias
RUN pip install --no-cache-dir -r requirements.txt

# Copia el script de Python en el contenedor
COPY pub.py /app/pub.py

# Comando para ejecutar el script del publicador
CMD ["python", "pub.py"]

