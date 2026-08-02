package com.example.adhyayan.core.network.di

import com.example.adhyayan.core.network.api.NvidiaApi
import com.example.adhyayan.core.network.api.SupabaseApi
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideNvidiaRetrofit(): Retrofit {
        return Retrofit.Builder()
            .baseUrl("https://integrate.api.nvidia.com/")
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    fun provideNvidiaApi(retrofit: Retrofit): NvidiaApi {
        return retrofit.create(NvidiaApi::class.java)
    }

    @Provides
    @Singleton
    fun provideSupabaseApi(): SupabaseApi {
        val retrofit = Retrofit.Builder()
            .baseUrl("https://ttkfjwpwfeczbqqmsiqp.supabase.co/")
            .addConverterFactory(GsonConverterFactory.create())
            .build()
        return retrofit.create(SupabaseApi::class.java)
    }
}
