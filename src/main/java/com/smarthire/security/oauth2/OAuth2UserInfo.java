package com.smarthire.security.oauth2;

import java.util.Map;

/**
 * Standard accessor for Google OAuth2 user attributes.
 */
public class OAuth2UserInfo {

    private final Map<String, Object> attributes;

    public OAuth2UserInfo(Map<String, Object> attributes) {
        this.attributes = attributes != null ? attributes : Map.of();
    }

    public String getId() {
        Object sub = attributes.get("sub");
        return sub != null ? String.valueOf(sub) : null;
    }

    public String getName() {
        Object name = attributes.get("name");
        return name != null ? String.valueOf(name) : null;
    }

    public String getEmail() {
        Object email = attributes.get("email");
        return email != null ? String.valueOf(email).trim().toLowerCase() : null;
    }

    public String getImageUrl() {
        Object picture = attributes.get("picture");
        return picture != null ? String.valueOf(picture) : null;
    }

    public Map<String, Object> getAttributes() {
        return attributes;
    }
}
