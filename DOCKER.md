# Docker

## Build the image

The frontend API URL is embedded into the Vite bundle during the image build:

```bash
docker build --build-arg VITE_API_URL=http://localhost:8080/api -t clinic-booking-frontend .
```

For a deployed backend, replace the value with the URL reachable by users' browsers:

```bash
docker build --build-arg VITE_API_URL=https://api.example.com/api -t clinic-booking-frontend .
```

## Run the container

```bash
docker run -d \
  --name clinic_booking_frontend \
  -p 3000:80 \
  clinic-booking-frontend
```

Open http://localhost:3000.

## Run the backend and frontend together

If both containers are running locally, `localhost` in `VITE_API_URL` refers to the user's browser, not the frontend container. Build with the backend URL exposed on the host instead:

```bash
docker build --build-arg VITE_API_URL=http://localhost:8080/api -t clinic-booking-frontend .
```

The backend must allow the frontend origin (`http://localhost:3000`) through CORS. The frontend automatically sends the required `x-api-version: 1` header.
