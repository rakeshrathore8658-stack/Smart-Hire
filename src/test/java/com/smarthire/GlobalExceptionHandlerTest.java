package com.smarthire;

import com.smarthire.exception.BadRequestException;
import com.smarthire.exception.ErrorResponse;
import com.smarthire.exception.GlobalExceptionHandler;
import com.smarthire.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.ModelAndView;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler handler;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
    }

    @Test
    @DisplayName("API Request: ResourceNotFoundException returns 404 JSON ErrorResponse")
    void handleNotFound_ApiRequest() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/resumes/999");
        MockHttpServletResponse response = new MockHttpServletResponse();

        Object result = handler.handleNotFound(new ResourceNotFoundException("Resume not found with id: '999'"), request, response);

        assertThat(result).isInstanceOf(ResponseEntity.class);
        ResponseEntity<?> entity = (ResponseEntity<?>) result;
        assertThat(entity.getStatusCode().value()).isEqualTo(404);
        ErrorResponse body = (ErrorResponse) entity.getBody();
        assertThat(body).isNotNull();
        assertThat(body.getStatus()).isEqualTo(404);
        assertThat(body.getMessage()).contains("Resume not found");
        assertThat(body.getPath()).isEqualTo("/api/resumes/999");
    }

    @Test
    @DisplayName("Web UI Request: ResourceNotFoundException returns ErrorResponse with status 404")
    void handleNotFound_WebUiRequest() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/dashboard/unknown-page");
        MockHttpServletResponse response = new MockHttpServletResponse();

        Object result = handler.handleNotFound(new ResourceNotFoundException("Candidate not found"), request, response);

        assertThat(result).isInstanceOf(ResponseEntity.class);
        ResponseEntity<?> entity = (ResponseEntity<?>) result;
        assertThat(entity.getStatusCode().value()).isEqualTo(404);
        ErrorResponse body = (ErrorResponse) entity.getBody();
        assertThat(body).isNotNull();
        assertThat(body.getStatus()).isEqualTo(404);
    }

    @Test
    @DisplayName("API Request: IllegalArgumentException returns 400 JSON ErrorResponse")
    void handleBadRequest_ApiRequest() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/register");
        request.setContentType(MediaType.APPLICATION_JSON_VALUE);
        request.addHeader("Accept", MediaType.APPLICATION_JSON_VALUE);
        MockHttpServletResponse response = new MockHttpServletResponse();

        Object result = handler.handleBadRequest(new IllegalArgumentException("Passwords do not match"), request, response);

        assertThat(result).isInstanceOf(ResponseEntity.class);
        ResponseEntity<?> entity = (ResponseEntity<?>) result;
        assertThat(entity.getStatusCode().value()).isEqualTo(400);
        ErrorResponse body = (ErrorResponse) entity.getBody();
        assertThat(body).isNotNull();
        assertThat(body.getMessage()).isEqualTo("Passwords do not match");
    }

    @Test
    @DisplayName("Web UI Request: BadRequestException returns ErrorResponse with status 400")
    void handleBadRequest_WebUiRequest() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/dashboard/jobs/invalid");
        MockHttpServletResponse response = new MockHttpServletResponse();

        Object result = handler.handleBadRequest(new BadRequestException("Invalid vacancy reference"), request, response);

        assertThat(result).isInstanceOf(ResponseEntity.class);
        ResponseEntity<?> entity = (ResponseEntity<?>) result;
        assertThat(entity.getStatusCode().value()).isEqualTo(400);
        ErrorResponse body = (ErrorResponse) entity.getBody();
        assertThat(body).isNotNull();
        assertThat(body.getStatus()).isEqualTo(400);
    }

    @Test
    @DisplayName("MaxUploadSizeExceededException returns 413 Payload Too Large")
    void handleMaxUploadSizeExceeded() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/resumes/upload");
        MockHttpServletResponse response = new MockHttpServletResponse();

        Object result = handler.handleMaxUploadSizeExceeded(new MaxUploadSizeExceededException(10485760), request, response);

        assertThat(result).isInstanceOf(ResponseEntity.class);
        ResponseEntity<?> entity = (ResponseEntity<?>) result;
        assertThat(entity.getStatusCode().value()).isEqualTo(413);
        ErrorResponse body = (ErrorResponse) entity.getBody();
        assertThat(body).isNotNull();
        assertThat(body.getStatus()).isEqualTo(413);
        assertThat(body.getMessage()).contains("limit");
    }

    @Test
    @DisplayName("AccessDeniedException returns 403 Forbidden")
    void handleAccessDenied() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/hr/candidates");
        MockHttpServletResponse response = new MockHttpServletResponse();

        Object result = handler.handleAccessDenied(new AccessDeniedException("Access is denied"), request, response);

        assertThat(result).isInstanceOf(ResponseEntity.class);
        ResponseEntity<?> entity = (ResponseEntity<?>) result;
        assertThat(entity.getStatusCode().value()).isEqualTo(403);
    }

    @Test
    @DisplayName("Unhandled Exception returns 500 Internal Server Error")
    void handleGeneralException() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/test");
        MockHttpServletResponse response = new MockHttpServletResponse();

        Object result = handler.handleGlobalException(new RuntimeException("Database timeout"), request, response);

        assertThat(result).isInstanceOf(ResponseEntity.class);
        ResponseEntity<?> entity = (ResponseEntity<?>) result;
        assertThat(entity.getStatusCode().value()).isEqualTo(500);
    }
}
