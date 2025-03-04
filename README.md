# forum-advanced-features

A modern web forum built with Go that enables user communication through posts, comments, and reactions.

## Project Objectives

The project follows the same principles as the first subject while implementing advanced features:

### Core Features

1. **User Notifications**
   - Notifications for post likes/dislikes
   - Notifications for post comments

2. **User Activity Tracking**
   - User created posts
   - Posts where user left likes/dislikes
   - User comments with:
     - Comment content
     - Associated post details

3. **Content Management**
   - Edit/Remove posts
   - Edit/Remove comments

## Features

- **User Authentication**
  - Secure registration and login system
  - Email verification
  - Session management with cookies
  - Password encryption using bcrypt

- **Posts & Comments**
  - Create, read, and delete posts
  - Comment on posts
  - Associate categories with posts
  - File attachments for posts

- **Interactive Features**
  - Like/dislike posts and comments
  - Real-time updates for reactions
  - User profile management
  - Avatar/profile picture support

- **Content Organization**
  - Category-based post filtering
  - View created posts
  - View liked posts
  
- **Image Upload Constraints**
  - Maximum image size: 20 MB
  - If an image exceeds 20 MB, an error message will inform the user that the image is too large

## Technology Stack

### Backend
- Go (Standard library)
- SQLite3 for database
- bcrypt for password encryption
- UUID package (gofrs/uuid or google/uuid)

### Frontend
- Pure HTML/CSS/JavaScript
- No external frameworks
- Responsive design
- Modern UI/UX

### Project Structure
```bash
forum-advanced-features/
│
├── authentication/
├── controllers/
│   ├── categories.go
│   ├── categories_test.go
│   ├── filters.go
│   ├── image_handler.go
│   ├── post_handler.go
│   ├── post_handler_test.go
│   └── profile_handler.go
├── static/
├── templates/
├── utils/
├── Dockerfile
├── README.md
├── buildDocker.sh
├── fly.toml
├── go.mod
├── go.sum
└── main.go
```

## Development Guidelines

1. **Backend Requirements**
   - Must be written in Go
   - Must follow good coding practices
   - Unit testing is recommended

2. **Allowed Packages**
   - All standard Go packages
   - sqlite3
   - bcrypt
   - gofrs/uuid or google/uuid

## Learning Objectives

This project focuses on implementing:
- Real-time notifications
- Users activity tracking

## Prerequisites

- Go 1.19 or higher
- Docker
- SQLite3

## Installation

1. Clone the repository:
```bash
git clone https://learn.zone01kisumu.ke/git/somotto/forum-advanced-features.git
cd forum-advanced-features
```

2. Install dependencies:
```bash
go mod init forum
```
```bash
go mod tidy
```

3. Run the application:
```bash
go run .
```

## Building and Running the Application

### Using the `buildDocker.sh` Script


2. **Make the script executable**:

```sh
  chmod +x buildDocker.sh
```

3. **Run the script**:

```sh
  ./buildDocker.sh
```

  This script will:
  - Build the Docker image for the application.
  - Stop and remove any existing container with the same name.
  - Run a new container with the built image.

4. **Access the application**:

  Open your web browser and navigate to `http://localhost:8000`.

### Manually Using Docker Commands

1. **Build the Docker image**:

```sh
  docker build -t forum .
```

2. **Run the Docker container**:

```sh
  docker run -d --name forum-container -p 8000:8000 forum
```


## Troubleshooting

- **Check container logs**:

  If you encounter any issues, you can check the logs of the running container:

```sh
  docker logs forum-container
```

- **Interactive mode**:

You can run the container in interactive mode to debug:

```sh
  docker run -it --name forum-container -p 8000:8000 forum /bin/sh
```

  Once inside the container, you can manually start the application and check for any errors.


## Database Schema

The application uses SQLite with the following main tables:
- Users
- Posts
- Comments
- Categories
- Reactions
- Sessions

## API Endpoints

### Authentication
- `POST /signup` - Register new user
- `POST /signin` - User login
- `POST /signout` - User logout

### Posts
- `GET /` - Get all posts
- `GET /post/{id}` - Get single post
- `POST /post` - Create new post
- `POST /post/delete` - Delete post

### Comments
- `POST /comment` - Add comment
- `POST /comment/delete` - Delete comment
- `POST /comment/edit` - Edit comment

### Reactions
- `POST /react` - Like/dislike post
- `POST /commentreact` - Like/dislike comment

### Filters
- `GET /category/{id}` - Filter posts by category
- `GET /created` - View created posts
- `GET /liked` - View liked posts

## Security Features

- Password encryption using bcrypt
- Session management with UUID
- Input validation and sanitization
- Secure cookie handling

### Running Tests
```bash
go test ./...
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
