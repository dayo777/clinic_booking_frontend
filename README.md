# CarePoint Clinic Frontend

A responsive React + TypeScript dashboard for the [Clinic Booking API](https://github.com/dayo777/clinic_booking_api). It provides a practical UI for the implemented patient, doctor, schedule, and appointment endpoints.

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

The default API URL is `http://localhost:8080/api`. Change `VITE_API_URL` in `.env` when the backend is hosted elsewhere. The client automatically sends the required `x-api-version: 1` header.

## Included workflows

- API health/error state with retry
- Patient listing, search, registration, and archive
- Doctor listing and registration
- Appointment listing with confirm/cancel actions
- Responsive dashboard with operational summary

The backend currently exposes appointment lists by patient/doctor, so the dashboard loads appointments for the first five patients returned by the API. CORS must be enabled by the backend when the frontend and API run on different origins.

## Backend route note

The frontend uses the implemented schedule route `/doctor/{id}/create-doctor-schedule`, which differs from the older `endpoints.md` example.
