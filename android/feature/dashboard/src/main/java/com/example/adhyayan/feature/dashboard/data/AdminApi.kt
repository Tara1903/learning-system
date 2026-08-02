package com.example.adhyayan.feature.dashboard.data

import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.POST

@Serializable
data class UserProfile(
    val phone: String? = null,
    val section: String? = null,
    val admissionNumber: String? = null,
    val guardianName: String? = null,
    val dob: String? = null,
    val gender: String? = null,
    val schoolName: String? = null,
    val board: String? = null,
    val previousPercentage: String? = null,
    val fatherName: String? = null,
    val motherName: String? = null,
    val parentMobile: String? = null,
    val whatsappNumber: String? = null,
    val occupation: String? = null,
    val address: String? = null,
    val city: String? = null,
    val pinCode: String? = null,
    val subjectsToJoin: String? = null,
    val batchTiming: String? = null,
    val medium: String? = null,
    val weakSubjects: String? = null,
    val tuitionStartDate: String? = null,
    val medicalCondition: String? = null,
    val dateOfAdmission: String? = null,
    val feesPlan: String? = null,
    val discount: String? = null,
    val registrationFee: String? = null,
    val receiptNo: String? = null,
    val customStudentId: String? = null
)

@Serializable
data class CreateUserRequest(
    val name: String,
    val email: String,
    val `class`: String? = null, // for students
    val profile: UserProfile,
    val isActive: Boolean = true
)

@Serializable
data class CreateUserResponse(
    val success: Boolean,
    val data: UserData? = null,
    val message: String? = null
)

@Serializable
data class UserData(
    val id: String
)

interface AdminApi {
    @POST("admin/create-student")
    suspend fun createStudent(@Body request: CreateUserRequest): CreateUserResponse

    @POST("admin/create-teacher")
    suspend fun createTeacher(@Body request: CreateUserRequest): CreateUserResponse
}
