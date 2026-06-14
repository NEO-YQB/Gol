group = "io.flutter.plugins.urllauncher"
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
    buildFeatures {
        buildConfig = true
    }

    namespace = "io.flutter.plugins.urllauncher"
    compileSdk = flutter.compileSdkVersion

    defaultConfig {
        minSdk = 24
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
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
    // Java language implementation
    implementation("androidx.core:core:1.17.0")
    implementation("androidx.annotation:annotation:1.9.1")
    implementation("androidx.browser:browser:1.9.0")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.mockito:mockito-core:5.23.0")
    testImplementation("androidx.test:core:1.7.0")
    testImplementation("org.robolectric:robolectric:4.16")
}
