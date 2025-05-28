# Social Forum

A modern web forum built with Go that enables user communication through posts, comments, reactions, and real-time notifications.

## Project Overview

A feature-rich social forum platform with real-time notifications, user activity tracking, and interactive features.

### Core Features

1. **Real-time Notifications**
   - Toast notifications for new interactions
   - Custom notification sounds
   - Visual notification alerts
   - Notifications for:
     - Post likes/dislikes
     - New comments
     - Direct messages

2. **User Activity & Profile**
   - Customizable profile pictures
   - Activity statistics tracking
   - View created posts
   - Comment history
   - Liked content tracking

3. **Interactive Features**
   - Real-time post updates
   - Dynamic content loading
   - Animated interactions
   - Toast notifications

## Technical Features

### Frontend Components

- **Notification System**
  - Custom notification handler
  - Toast notifications
  - Sound alerts
  - Animation effects

- **Profile Management**
  - Profile picture upload
  - Activity statistics
  - User content management
  - Image upload validation

- **User Interface**
  - Responsive design
  - Modern animations
  - Interactive components
  - Real-time updates

### Backend Services

- **API Endpoints**
  - User authentication
  - Profile management
  - Content CRUD operations
  - Image processing

- **Data Management**
  - SQLite database
  - File storage
  - Session handling
  - Data validation

### Image Upload Features

- **Profile Pictures**
  - Maximum size: 20MB
  - Supported formats: JPEG, PNG, GIF
  - Automatic validation
  - Error handling

- **Upload Constraints**
  - Server-side validation
  - Client-side checks
  - Format restrictions
  - Size limitations

## Technology Stack

### Backend
- Go (Standard library)
- SQLite3 database
- bcrypt encryption
- UUID management

### Frontend
- Vanilla JavaScript
- Custom CSS
- HTML5
- WebSocket (for real-time features)

## Project Structure
```bash
social-forum/
├── controllers/
│   ├── api_handler.go
│   ├── image_handler.go
│   └── profile_handler.go
├── static/
│   ├── js/
│   │   ├── components/
│   │   │   ├── profile/
│   │   │   └── posts/
│   │   └── utils/
│   ├── css/
│   └── sounds/
├── templates/
├── utils/
└── main.go
```

## Setup Instructions

1. Clone the repository:
```bash
git clone https://github.com/bshisia/social-forum.git
cd social-forum
```

2. Install dependencies:
```bash
go mod tidy
```

3. Run the application:
```bash
go run .
```

## Development Guidelines

1. **Code Structure**
   - Modular component design
   - Event-driven architecture
   - Clean code practices
   - Comprehensive error handling

2. **Feature Implementation**
   - Client-side validation
   - Server-side security
   - Responsive design
   - Cross-browser compatibility

## Security Features

- Secure file uploads
- Input validation
- XSS prevention
- CSRF protection
- Secure session management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
