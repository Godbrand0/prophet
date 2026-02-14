#!/bin/bash

# Script to start both the backend HTTP server and frontend development server

echo "Starting Prophet servers..."
echo "This will start:"
echo "1. Backend HTTP server on port 3001"
echo "2. Frontend development server on port 3000"
echo ""

# Check if we're in the right directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "Error: Please run this script from the project root directory"
    exit 1
fi

# Install backend dependencies if needed
if [ ! -d "backend/node_modules" ]; then
    echo "Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

# Install frontend dependencies if needed
if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

echo "Starting servers..."
echo "Backend server will run on: http://localhost:3001"
echo "Frontend will run on: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Start both servers in parallel
# Using & to run in background
cd backend && npm run dev:http &
BACKEND_PID=$!

cd ../frontend && npm run dev &
FRONTEND_PID=$!

# Function to kill both processes on exit
cleanup() {
    echo ""
    echo "Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "Servers stopped."
    exit
}

# Set up trap to catch Ctrl+C
trap cleanup INT

# Wait for both processes
wait