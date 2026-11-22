plugins {
    id("com.android.application")
}

android {
    namespace = "app.glassline.os"
    compileSdk = 35

    defaultConfig {
        applicationId = "app.glassline.os"
        minSdk = 26
        targetSdk = 35
        versionCode = 2700
        versionName = "27.0.0"
    }

    // The web shell in ../../phone is packaged as the app's assets; nothing is copied by hand.
    sourceSets["main"].assets.srcDirs("../../phone")
    androidResources {
        ignoreAssetsPattern = "!start.*:!*.md:!sw.js"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            // Signed with the debug key so the APK installs without a keystore. Use your own key before publishing.
            signingConfig = signingConfigs.getByName("debug")
        }
    }
    // The release lint pass downloads a large toolchain; the build does not need it to produce the APK.
    lint { checkReleaseBuilds = false }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
}
