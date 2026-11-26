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
        versionCode = 2701
        versionName = "27.0.1"
    }

    // Two editions of the same app (same id and signature, so either replaces the other):
    // - standard: installs from a browser everywhere, including countries where Google Play Protect's "enhanced fraud
    //   protection" blocks downloaded apps that can read other apps' notifications (India, Brazil, Thailand and others).
    // - full: adds the notification reader (src/full/AndroidManifest.xml), for installing from a computer or a store.
    flavorDimensions += "edition"
    productFlavors {
        create("standard") { dimension = "edition" }
        create("full") { dimension = "edition"; versionNameSuffix = "-full" }
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
