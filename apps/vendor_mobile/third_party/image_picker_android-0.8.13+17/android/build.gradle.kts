import org.jetbrains.kotlin.gradle.dsl.JvmTarget

group = "io.flutter.plugins.imagepicker"
version = "1.0-SNAPSHOT"

val prepareTypedefArtifacts by tasks.registering {
    doLast {
        val baseDir = layout.buildDirectory.dir("intermediates/annotations_typedef_file").get().asFile
        listOf("debug", "release").forEach { variant ->
            val targetDir = baseDir.resolve("$variant/extract${variant.replaceFirstChar { it.uppercase() }}Annotations")
            targetDir.mkdirs()
            val typedefs = targetDir.resolve("typedefs.txt")
            if (!typedefs.exists()) {
                typedefs.writeText("")
            }
        }
    }
}

buildscript {
    val kotlinVersion = "2.1.0"
    repositories {
        google()
        mavenCentral()
    }

    dependencies {
        classpath("com.android.tools.build:gradle:8.9.1")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion")
    }
}

tasks.matching { it.name.contains("extract", ignoreCase = true) && it.name.contains("Annotations", ignoreCase = true) }
    .configureEach {
        enabled = false
    }

tasks.matching { it.name == "syncDebugLibJars" || it.name == "syncReleaseLibJars" }
    .configureEach {
        dependsOn(prepareTypedefArtifacts)
    }

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

plugins {
    id("com.android.library")
    id("kotlin-android")
}

kotlin {
    compilerOptions {
        jvmTarget = JvmTarget.fromTarget(JavaVersion.VERSION_17.toString())
    }
}

android {
    namespace = "io.flutter.plugins.imagepicker"
    compileSdk = flutter.compileSdkVersion

    defaultConfig {
        minSdk = 24
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    lint {
        checkAllWarnings = true
        warningsAsErrors = true
        disable.addAll(setOf("AndroidGradlePluginVersion", "InvalidPackage", "GradleDependency", "NewerVersionAvailable"))
    }

    dependencies {
        implementation("androidx.core:core:1.18.0")
        implementation("androidx.annotation:annotation:1.9.1")
        implementation("androidx.exifinterface:exifinterface:1.4.2")
        implementation("androidx.activity:activity:1.12.4")

        testImplementation("junit:junit:4.13.2")
        testImplementation("org.mockito:mockito-core:5.23.0")
        testImplementation("androidx.test:core:1.7.0")
        testImplementation("org.robolectric:robolectric:4.16")
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    testOptions {
        unitTests {
            isIncludeAndroidResources = true
            isReturnDefaultValues = true
            all {
                it.outputs.upToDateWhen { false }
                it.testLogging {
                    events("passed", "skipped", "failed", "standardOut", "standardError")
                    showStandardStreams = true
                }
            }
        }
    }
}
