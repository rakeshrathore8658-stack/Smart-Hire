package com.smarthire;

import com.smarthire.controller.HrEmailSettingsController;
import com.smarthire.dto.HrEmailSettingDTO;
import com.smarthire.entity.HrEmailSetting;
import com.smarthire.entity.User;
import com.smarthire.repository.HrEmailSettingRepository;
import com.smarthire.repository.UserRepository;
import com.smarthire.security.EncryptionService;
import com.smarthire.service.DynamicEmailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

public class HrEmailSettingsTest {

    private HrEmailSettingRepository hrEmailSettingRepository;
    private UserRepository userRepository;
    private DynamicEmailService dynamicEmailService;
    private EncryptionService encryptionService;
    private HrEmailSettingsController controller;

    private User hrUser;

    @BeforeEach
    void setUp() {
        hrEmailSettingRepository = mock(HrEmailSettingRepository.class);
        userRepository = mock(UserRepository.class);
        dynamicEmailService = mock(DynamicEmailService.class);
        encryptionService = mock(EncryptionService.class);

        controller = new HrEmailSettingsController(
                hrEmailSettingRepository,
                dynamicEmailService,
                encryptionService,
                userRepository
        );

        hrUser = new User();
        hrUser.setId(1L);
        hrUser.setEmail("hr@smarthire.com");
        hrUser.setRole("HR");
        hrUser.setFullName("HR Manager");
        hrUser.setCompanyName("SmartHire Inc");

        when(userRepository.findByEmail("hr@smarthire.com")).thenReturn(Optional.of(hrUser));
        when(userRepository.findById(1L)).thenReturn(Optional.of(hrUser));
        when(encryptionService.encrypt(anyString())).thenAnswer(inv -> "ENC_" + inv.getArgument(0));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-User-Email", "hr@smarthire.com");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
    }

    @Test
    @DisplayName("Unit test: Save and verify HR email settings with pure Mockito")
    void testSaveAndGetSettings() {
        HrEmailSetting savedSetting = HrEmailSetting.builder()
                .id(10L)
                .hrUserId(1L)
                .senderEmail("recruiter@gmail.com")
                .senderName("SmartHire Recruiter")
                .appPassword("ENC_pass")
                .isActive(true)
                .isVerified(false)
                .build();

        when(hrEmailSettingRepository.findByHrUserId(1L)).thenReturn(Optional.of(savedSetting));
        when(hrEmailSettingRepository.findFirstByHrUserIdOrderByIdDesc(1L)).thenReturn(Optional.of(savedSetting));
        when(hrEmailSettingRepository.findByHrUserIdAndIsActiveTrue(1L)).thenReturn(Optional.of(savedSetting));
        when(hrEmailSettingRepository.save(any(HrEmailSetting.class))).thenReturn(savedSetting);

        HrEmailSettingDTO dto = HrEmailSettingDTO.builder()
                .senderEmail("recruiter@gmail.com")
                .appPassword("abcd efgh ijkl mnop")
                .senderName("SmartHire Recruiter")
                .build();

        ResponseEntity<?> saveRes = controller.saveEmailSettings(dto);
        assertTrue(saveRes.getStatusCode().is2xxSuccessful());

        ResponseEntity<?> getRes = controller.getEmailSettings();
        assertTrue(getRes.getStatusCode().is2xxSuccessful());
        Map<?, ?> map = (Map<?, ?>) getRes.getBody();
        assertNotNull(map);
        assertEquals(true, map.get("configured"));
        assertEquals("recruiter@gmail.com", map.get("senderEmail"));

        // Verify delete
        ResponseEntity<?> delRes = controller.deleteEmailSettings();
        assertTrue(delRes.getStatusCode().is2xxSuccessful());
        verify(hrEmailSettingRepository).deleteByHrUserId(1L);
    }
}
