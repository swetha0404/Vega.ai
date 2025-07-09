# AI MVP UI

This project consists of a FastAPI backend and a frontend application. Follow these instructions to set up and run the project locally.

## Prerequisites

- Python 3.8 or higher
- Node.js 16 or higher (for frontend)
- Git

## Backend Setup

1. Clone the repository:
   
2. Create and activate a virtual environment:
   
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # Mac/Linux
   python -m venv venv
   source venv/bin/activate
   

3. Install Python dependencies:
   
   pip install -r requirements.txt
   

4. Configure the application:
   - Copy `config.yaml` and update it with your PingDirectory LDAP details
   - Make sure to keep sensitive information secure and never commit it to version control

5. Run the FastAPI server:
   
   uvicorn main:app --reload
   

## Frontend Setup

1. Navigate to the frontend directory:
   
   cd frontend
   

2. Install Node.js dependencies:
   
   npm install
   

3. Start the development server:
   
   npm run dev
   
   The frontend application will be available 

## API Endpoints

- `POST /login` — Authenticate user against PingDirectory LDAP or temporary username and pasword in mentioned in config.yaml file
- Additional endpoints will be documented here as they are added

## Development

- Backend code is in the root directory
- Frontend code is in the `frontend/` directory
- Use `requirements.txt` to manage Python dependencies
- Use `package.json` in the frontend directory to manage Node.js dependencies

## Troubleshooting

1. If you encounter any issues with the virtual environment:
   - Delete the `venv` folder
   - Create a new virtual environment following the setup steps above

2. For frontend issues:
   - Clear the `node_modules` folder and run `npm install` again
   - Make sure you're using a compatible Node.js version

3. For backend issues:
   - Check if all dependencies are installed correctly
   - Verify your `config.yaml` settings
   - Check the console for detailed error messages

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Submit a pull request

