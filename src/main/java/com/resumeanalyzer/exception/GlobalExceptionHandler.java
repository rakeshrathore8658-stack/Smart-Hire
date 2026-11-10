package com.resumeanalyzer.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.ModelAndView;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

/**
 * Centralized Global Exception Handler for SmartHire.
 * Handles both REST API JSON responses and Web UI error templates seamlessly.
 */
@ControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    private static final DateTimeFormatter TIMESTAMP_FORMATTER = DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm:ss");

    /**
     * 1. Resource Not Found (404)
     */
    @ExceptionHandler({ResourceNotFoundException.class, NoResourceFoundException.class, NoHandlerFoundException.class})
    public Object handleNotFound(Exception ex, HttpServletRequest request, HttpServletResponse response) {
        if (request != null && "/favicon.ico".equals(request.getRequestURI())) {
            return ResponseEntity.noContent().build();
        }
        log.warn("Resource not found: {} for URI: {}", ex.getMessage(), request != null ? request.getRequestURI() : "/");
        HttpStatus status = HttpStatus.NOT_FOUND;

        if (isApiRequest(request)) {
            return ResponseEntity.status(status).body(ErrorResponse.builder()
                    .timestamp(LocalDateTime.now())
                    .status(status.value())
                    .error(status.getReasonPhrase())
                    .message(ex.getMessage() != null ? ex.getMessage() : "The requested resource was not found.")
                    .path(request.getRequestURI())
                    .build());
        }

        return createErrorView(request, response, status,
                "404 - Page Not Found",
                "The page, candidate, or resource you are looking for does not exist or may have been removed.",
                ex);
    }

    /**
     * 2. Bad Request / Validation Failure (400)
     */
    @ExceptionHandler({BadRequestException.class, IllegalArgumentException.class})
    public Object handleBadRequest(Exception ex, HttpServletRequest request, HttpServletResponse response) {
        log.warn("Bad request: {} on URI: {}", ex.getMessage(), request.getRequestURI());
        HttpStatus status = HttpStatus.BAD_REQUEST;

        if (isApiRequest(request)) {
            return ResponseEntity.status(status).body(ErrorResponse.builder()
                    .timestamp(LocalDateTime.now())
                    .status(status.value())
                    .error(status.getReasonPhrase())
                    .message(ex.getMessage())
                    .path(request.getRequestURI())
                    .build());
        }

        return createErrorView(request, response, status,
                "400 - Invalid Request",
                ex.getMessage() != null ? ex.getMessage() : "The request could not be processed due to invalid parameters.",
                ex);
    }

    /**
     * 3. Method Argument Validation Failure (400) - DTO @Valid
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public Object handleMethodArgumentNotValid(MethodArgumentNotValidException ex, HttpServletRequest request, HttpServletResponse response) {
        log.warn("Validation failed for URI: {}", request.getRequestURI());
        HttpStatus status = HttpStatus.BAD_REQUEST;

        Map<String, String> fieldErrors = new HashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }

        String summaryMessage = "Validation failed for " + fieldErrors.size() + " field(s).";

        if (isApiRequest(request)) {
            return ResponseEntity.status(status).body(ErrorResponse.builder()
                    .timestamp(LocalDateTime.now())
                    .status(status.value())
                    .error(status.getReasonPhrase())
                    .message(summaryMessage)
                    .path(request.getRequestURI())
                    .fieldErrors(fieldErrors)
                    .build());
        }

        return createErrorView(request, response, status,
                "400 - Form Validation Error",
                summaryMessage,
                ex);
    }

    /**
     * 4. Constraint Violation (400)
     */
    @ExceptionHandler(ConstraintViolationException.class)
    public Object handleConstraintViolation(ConstraintViolationException ex, HttpServletRequest request, HttpServletResponse response) {
        log.warn("Constraint violation on URI: {}", request.getRequestURI());
        HttpStatus status = HttpStatus.BAD_REQUEST;

        Map<String, String> errors = new HashMap<>();
        ex.getConstraintViolations().forEach(violation ->
                errors.put(violation.getPropertyPath().toString(), violation.getMessage())
        );

        if (isApiRequest(request)) {
            return ResponseEntity.status(status).body(ErrorResponse.builder()
                    .timestamp(LocalDateTime.now())
                    .status(status.value())
                    .error(status.getReasonPhrase())
                    .message("Validation constraint violated.")
                    .path(request.getRequestURI())
                    .fieldErrors(errors)
                    .build());
        }

        return createErrorView(request, response, status,
                "400 - Validation Constraint Error",
                "One or more validation constraints were violated.",
                ex);
    }

    /**
     * 5. File Size Exceeded (413)
     */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public Object handleMaxUploadSizeExceeded(MaxUploadSizeExceededException ex, HttpServletRequest request, HttpServletResponse response) {
        log.warn("File upload size exceeded on URI: {}", request.getRequestURI());
        HttpStatus status = HttpStatus.PAYLOAD_TOO_LARGE;
        String message = "The uploaded file exceeds the allowed size limit (maximum 10 MB). Please choose a smaller resume file.";

        if (isApiRequest(request)) {
            return ResponseEntity.status(status).body(ErrorResponse.builder()
                    .timestamp(LocalDateTime.now())
                    .status(status.value())
                    .error(status.getReasonPhrase())
                    .message(message)
                    .path(request.getRequestURI())
                    .build());
        }

        return createErrorView(request, response, status,
                "413 - File Size Exceeded",
                message,
                ex);
    }

    /**
     * 6. Access Denied / Forbidden (403)
     */
    @ExceptionHandler({AccessDeniedException.class, ForbiddenException.class})
    public Object handleAccessDenied(Exception ex, HttpServletRequest request, HttpServletResponse response) {
        log.warn("Access denied for URI: {} - {}", request.getRequestURI(), ex.getMessage());
        HttpStatus status = HttpStatus.FORBIDDEN;
        String message = "You do not have permission to access this resource or perform this action.";

        if (isApiRequest(request)) {
            return ResponseEntity.status(status).body(ErrorResponse.builder()
                    .timestamp(LocalDateTime.now())
                    .status(status.value())
                    .error(status.getReasonPhrase())
                    .message(message)
                    .path(request.getRequestURI())
                    .build());
        }

        return createErrorView(request, response, status,
                "403 - Access Denied",
                message,
                ex);
    }

    /**
     * 7. HTTP Method Not Supported (405)
     */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public Object handleMethodNotSupported(HttpRequestMethodNotSupportedException ex, HttpServletRequest request, HttpServletResponse response) {
        log.warn("Method not allowed: {} on URI: {}", ex.getMethod(), request.getRequestURI());
        HttpStatus status = HttpStatus.METHOD_NOT_ALLOWED;
        String message = "HTTP method " + ex.getMethod() + " is not supported for this endpoint.";

        if (isApiRequest(request)) {
            return ResponseEntity.status(status).body(ErrorResponse.builder()
                    .timestamp(LocalDateTime.now())
                    .status(status.value())
                    .error(status.getReasonPhrase())
                    .message(message)
                    .path(request.getRequestURI())
                    .build());
        }

        return createErrorView(request, response, status,
                "405 - Method Not Allowed",
                message,
                ex);
    }

    /**
     * 8. Unsupported Media Type (415)
     */
    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public Object handleMediaTypeNotSupported(HttpMediaTypeNotSupportedException ex, HttpServletRequest request, HttpServletResponse response) {
        log.warn("Media type not supported: {} on URI: {}", ex.getContentType(), request.getRequestURI());
        HttpStatus status = HttpStatus.UNSUPPORTED_MEDIA_TYPE;
        String message = "Content-Type '" + ex.getContentType() + "' is not supported.";

        if (isApiRequest(request)) {
            return ResponseEntity.status(status).body(ErrorResponse.builder()
                    .timestamp(LocalDateTime.now())
                    .status(status.value())
                    .error(status.getReasonPhrase())
                    .message(message)
                    .path(request.getRequestURI())
                    .build());
        }

        return createErrorView(request, response, status,
                "415 - Unsupported Media Type",
                message,
                ex);
    }

    /**
     * 9. Resume File Processing Failure (400 / 422)
     */
    @ExceptionHandler(FileProcessingException.class)
    public Object handleFileProcessing(FileProcessingException ex, HttpServletRequest request, HttpServletResponse response) {
        log.error("Resume file processing error: {} on URI: {}", ex.getMessage(), request.getRequestURI());
        HttpStatus status = HttpStatus.UNPROCESSABLE_ENTITY;

        if (isApiRequest(request)) {
            return ResponseEntity.status(status).body(ErrorResponse.builder()
                    .timestamp(LocalDateTime.now())
                    .status(status.value())
                    .error(status.getReasonPhrase())
                    .message(ex.getMessage())
                    .path(request.getRequestURI())
                    .build());
        }

        return createErrorView(request, response, status,
                "Resume Extraction Failed",
                ex.getMessage(),
                ex);
    }

    /**
     * 10. AI Service Processing Failure (502 / 500)
     */
    @ExceptionHandler(AIProviderException.class)
    public Object handleAIProviderException(AIProviderException ex, HttpServletRequest request, HttpServletResponse response) {
        log.error("AI service failure: {} on URI: {}", ex.getMessage(), request.getRequestURI(), ex);
        HttpStatus status = HttpStatus.BAD_GATEWAY;
        String message = "The AI analysis service encountered an error while processing your resume: " + ex.getMessage();

        if (isApiRequest(request)) {
            return ResponseEntity.status(status).body(ErrorResponse.builder()
                    .timestamp(LocalDateTime.now())
                    .status(status.value())
                    .error(status.getReasonPhrase())
                    .message(message)
                    .path(request.getRequestURI())
                    .build());
        }

        return createErrorView(request, response, status,
                "502 - AI Service Unavailable",
                message,
                ex);
    }

    /**
     * 11. State / Logic Errors (500)
     */
    @ExceptionHandler(IllegalStateException.class)
    public Object handleIllegalState(IllegalStateException ex, HttpServletRequest request, HttpServletResponse response) {
        log.error("Illegal state exception on URI {}: {}", request.getRequestURI(), ex.getMessage(), ex);
        HttpStatus status = HttpStatus.INTERNAL_SERVER_ERROR;

        if (isApiRequest(request)) {
            return ResponseEntity.status(status).body(ErrorResponse.builder()
                    .timestamp(LocalDateTime.now())
                    .status(status.value())
                    .error(status.getReasonPhrase())
                    .message(ex.getMessage() != null ? ex.getMessage() : "An unexpected application state error occurred.")
                    .path(request.getRequestURI())
                    .build());
        }

        return createErrorView(request, response, status,
                "500 - Application Error",
                ex.getMessage() != null ? ex.getMessage() : "An unexpected server condition occurred.",
                ex);
    }

    /**
     * 12. Catch-All for Any Other Unhandled Exception (500)
     */
    @ExceptionHandler(Exception.class)
    public Object handleGlobalException(Exception ex, HttpServletRequest request, HttpServletResponse response) {
        log.error("Unhandled exception caught by GlobalExceptionHandler on URI {}: ", request.getRequestURI(), ex);
        HttpStatus status = HttpStatus.INTERNAL_SERVER_ERROR;
        String userFriendlyMessage = "An unexpected error occurred while processing your request. Please try again or contact support if the problem persists.";

        if (isApiRequest(request)) {
            return ResponseEntity.status(status).body(ErrorResponse.builder()
                    .timestamp(LocalDateTime.now())
                    .status(status.value())
                    .error(status.getReasonPhrase())
                    .message(userFriendlyMessage)
                    .path(request.getRequestURI())
                    .build());
        }

        return createErrorView(request, response, status,
                "500 - Internal Server Error",
                userFriendlyMessage,
                ex);
    }

    /**
     * Helper to detect if the request is an API / AJAX call expecting JSON.
     */
    private boolean isApiRequest(HttpServletRequest request) {
        if (request == null) {
            return false;
        }

        String uri = request.getRequestURI();
        if (uri != null && uri.startsWith("/api/")) {
            return true;
        }

        String accept = request.getHeader(HttpHeaders.ACCEPT);
        if (accept != null && (accept.contains("application/json") || accept.contains("text/json"))) {
            return true;
        }

        String requestedWith = request.getHeader("X-Requested-With");
        return "XMLHttpRequest".equalsIgnoreCase(requestedWith);
    }

    /**
     * Helper to construct a clean JSON ErrorResponse for browser & client requests.
     */
    private ResponseEntity<ErrorResponse> createErrorView(HttpServletRequest request, HttpServletResponse response,
                                                         HttpStatus status, String title, String message, Exception ex) {
        if (response != null) {
            response.setStatus(status.value());
        }

        ErrorResponse errorResponse = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(status.value())
                .error(status.getReasonPhrase())
                .message(message != null ? message : title)
                .path(request != null ? request.getRequestURI() : "/")
                .build();

        return ResponseEntity.status(status).body(errorResponse);
    }
}
