group = "io.flutter.plugins.flutter_plugin_android_lifecycle"
version = "1.0"

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
    repositories {
        google()
        mavenCentral()
    }

    dependencies {
        classpath("com.android.tools.build:gradle:8.9.1")
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
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

plugins {
    id("com.android.library")
}

android {
    namespace = "io.flutter.plugins.flutter_plugin_android_lifecycle"
    compileSdk = flutter.compileSdkVersion

    defaultConfig {
        minSdk = 24
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        consumerProguardFiles("proguard.txt")
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    lint {
        checkAllWarnings = true
        warningsAsErrors = true
        disable.addAll(setOf("AndroidGradlePluginVersion", "InvalidPackage", "GradleDependency", "NewerVersionAvailable"))
    }

    dependencies {
        implementation("androidx.annotation:annotation:1.9.1")
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

dependencies {
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.mockito:mockito-core:5.23.0")
}
